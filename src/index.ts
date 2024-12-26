import fs from "fs";
import path from "path";
import axios from "axios";
import Cloudflare from "cloudflare";
import config from "./config";

interface CloudflareDomainConfig {
  zoneID: string;
  apiToken: string;
}

interface SubdomainConfig {
  subdomain: string;
  domain: string;
  enabled: boolean;
}

interface Config {
  domains: Record<string, CloudflareDomainConfig>;
  subdomains: Record<string, SubdomainConfig>;
}

export class IPManager {
  private lockFilePath: string;
  private interval: number;
  private config: Config;
  private cfInstances: Record<string, Cloudflare> = {};
  private zoneID: Record<string, string> = {};

  constructor(config: Config, interval: number) {
    this.lockFilePath = path.resolve("./ip.lock");
    this.config = config;
    this.interval = interval;

    for (const domain in config.domains) {
      const zoneID = config.domains[domain]["zoneID"];
      const apiToken = config.domains[domain]["apiToken"];
      this.cfInstances[domain] = new Cloudflare({
        apiToken: apiToken,
      });
      this.zoneID[domain] = zoneID;
    }
  }

  private async fetchCurrentIP(): Promise<string> {
    try {
      const response = await axios.get("https://ifconfig.me/ip", {
        timeout: 5000,
      });
      return response.data.trim();
    } catch (error: any) {
      console.error("[❌] Failed to fetch IP:", error.message);
      throw new Error("[❌] Unable to fetch IP from https://ifconfig.me/ip");
    }
  }

  private getSavedIP(): string | null {
    if (fs.existsSync(this.lockFilePath)) {
      const ip = fs.readFileSync(this.lockFilePath, "utf-8").trim();
      return ip || null;
    }
    return null;
  }

  private saveCurrentIP(ip: string): void {
    fs.writeFileSync(this.lockFilePath, ip, "utf-8");
  }

  public async setCloudflareRecords(currentIP: string): Promise<void> {
    for (const key in this.config.subdomains) {
      const subdomain = this.config.subdomains[key];
      if (!subdomain.enabled) continue;

      const domainConfig = this.config.domains[subdomain.domain];
      if (!domainConfig) {
        console.warn(
          `[❌] No domain configuration found for domain: ${subdomain.domain}`
        );
        continue;
      }

      const cf = this.cfInstances[subdomain.domain];
      const zoneID = this.zoneID[subdomain.domain];
      const fullSubdomain = `${subdomain.subdomain}.${subdomain.domain}`;

      try {
        const dnsRecords = await cf.dns.records.list({ zone_id: zoneID });
        const existingRecord = dnsRecords.result.find(
          (record: any) => record.name === fullSubdomain && record.type === "A"
        );

        if (existingRecord) {
          // Update the record if it exists
          await cf.dns.records.edit(existingRecord.id || "", {
            type: "A",
            name: fullSubdomain,
            zone_id: zoneID,
            content: currentIP,
            ttl: 1,
            proxied: false,
          });
          console.log(
            `[✅] Updated DNS record for ${fullSubdomain} to IP: ${currentIP}`
          );
        } else {
          // Create a new record if it doesn't exist
          await cf.dns.records.create({
            type: "A",
            name: fullSubdomain,
            zone_id: zoneID,
            content: currentIP,
            ttl: 1,
            proxied: false,
          });
          console.log(
            `[✅] Created DNS record for ${fullSubdomain} with IP: ${currentIP}`
          );
        }
      } catch (error: any) {
        console.error(
          `[❌] Failed to update DNS record for ${fullSubdomain}:`,
          error.message
        );
      }
    }
  }

  public async checkIPChange(): Promise<void> {
    try {
      const currentIP = await this.fetchCurrentIP();
      const savedIP = this.getSavedIP();

      const nextRunTime = new Date(Date.now() + 60 * 1000).toLocaleTimeString();

      if (currentIP !== savedIP) {
        console.log(
          `[✅] IP has changed from ${
            savedIP || "unknown"
          } to ${currentIP}. Next run: ${nextRunTime}`
        );
        this.saveCurrentIP(currentIP);
        await this.setCloudflareRecords(currentIP);
      } else {
        console.log(
          `[❗] IP has not changed: ${currentIP}. Next run: ${nextRunTime}`
        );
      }
    } catch (error: any) {
      console.error("[❌] Error during IP check:", error.message);
    }
  }

  public start(): void {
    console.log(`[✅] Starting DDNS for Cloudflare domains`);
    this.checkIPChange();
    setInterval(() => this.checkIPChange(), this.interval);
  }
}

const ipManager = new IPManager(config, 60000);
ipManager.start();
