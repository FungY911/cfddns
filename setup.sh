#!/bin/bash

APP_DIR=$(pwd)
SERVICE_PATH="/etc/systemd/system/cfddns.service"
USER=$(whoami)

handle_error() {
  echo "[❌] $1"
  exit 1
}

echo "[❗] Checking if the current directory is correct..."
if [ ! -f "./src/index.ts" ] || [ ! -f "./src/config.ts" ]; then
  handle_error "Required files ./src/index.ts and ./src/config.ts not found in the current directory: $APP_DIR. Please navigate to the correct directory and run this script again."
else
  echo "[✅] Required files found. Proceeding..."
fi

echo "[❗] Checking if npm is installed..."
if ! command -v npm &> /dev/null; then
  echo "[❗] npm is not installed. Attempting to install npm..."
  if command -v apt &> /dev/null; then
    sudo apt update || handle_error "Failed to update package lists."
    sudo apt install -y nodejs npm || handle_error "Failed to install npm. Please install it manually."
    echo "[✅] npm installed successfully."
  else
    handle_error "npm is not installed and automatic installation is not supported on this system. Please install Node.js and npm manually."
  fi
else
  echo "[✅] npm is installed."
fi

echo "[❗] Installing dependencies with npm..."
npm install || handle_error "Failed to install dependencies with npm."

echo "[✅] Creating systemd service file at $SERVICE_PATH..."
cat <<EOF | sudo tee $SERVICE_PATH > /dev/null || handle_error "Failed to create systemd service file."
[Unit]
Description=DDNS for Cloudflare Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/npm start
Restart=always
User=$USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo "[✅] Reloading systemd daemon..."
sudo systemctl daemon-reload || handle_error "Failed to reload systemd daemon."

echo "[✅] Enabling the service..."
sudo systemctl enable cfddns.service || handle_error "Failed to enable the service."

echo "[✅] Starting the service..."
sudo systemctl start cfddns.service || handle_error "Failed to start the service."

sudo systemctl is-active --quiet cfddns.service
if [ $? -ne 0 ]; then
  handle_error "The service failed to start. Check logs for more details: sudo journalctl -u cfddns.service"
else
  echo "[✅] Service is running successfully."
fi

echo "[✅] Setup complete. Your app will now run on system startup."
echo "[❗] To view logs, use: sudo journalctl -u cfddns.service -f"
echo "[❗] To manage the service: start, stop, or restart using 'sudo systemctl <command> cfddns.service'"
