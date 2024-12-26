# Dynamic DNS Updater for Cloudflare

This is a dynamic DNS (DDNS) updater for Cloudflare that automatically updates DNS records when your public IP address changes. It's designed to run as a system service on Linux systems with `apt` package management.

## Features

- Automatically detects public IP changes and updates DNS records on Cloudflare.
- Supports multiple domains and subdomains.
- Runs as a systemd service for reliability and automatic startup.
- Easy setup script for installation and configuration.

## Requirements

- Linux system with `apt` (e.g., Ubuntu, Debian).
- Node.js and npm (automatically installed if not present).
- Cloudflare account and API token.

## Setup

Where to get [zoneID](https://developers.cloudflare.com/fundamentals/setup/find-account-and-zone-ids/)?
Where to create [apiToken](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)?

1. Clone this repository to your server:

   ```bash
   git clone https://github.com/fungy911/cfddns.git
   cd cfddns
   ```

2. Update ./src/config.ts to include your Cloudflare API token, zone IDs, and subdomains:

   ```typescript
   export default {
     domains: {
       "example.com": {
         zoneID: "your-zone-id",
         apiToken: "your-api-token",
       },
     },
     subdomains: {
       "1": {
         subdomain: "dynamic",
         domain: "example.com",
         enabled: true,
       },
     },
   };
   ```

3. Make the setup script executable:

   ```bash
   chmod +x ./setup.sh
   ```

4. Run the setup script:

   ```bash
   ./setup.sh
   ```

## Managing the Service

- Start the service:

```bash
sudo systemctl start cfddns.service
```

- Stop the service:

```bash
sudo systemctl stop cfddns.service
```

- Restart the service:

```bash
sudo systemctl restart cfddns.service
```

- View logs:

```bash
sudo journalctl -u cfddns.service -f
```

## Support

If you encounter any issues, please open an issue on GitHub.

License
This project is licensed under the MIT License. See the LICENSE file for details.
