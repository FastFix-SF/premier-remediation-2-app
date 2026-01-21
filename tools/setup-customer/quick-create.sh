#!/bin/bash

#######################################################################
# QUICK CREATE - Fast Customer Setup (No Prompts)
#
# Usage:
#   ./quick-create.sh <config-file.json>
#
# Example:
#   ./quick-create.sh customers/acme-roofing.json
#
# This is the fastest way to create multiple customers - just prepare
# your JSON config files and run this script for each one.
#######################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide a config file${NC}"
    echo ""
    echo "Usage: ./quick-create.sh <config-file.json>"
    echo ""
    echo "Example:"
    echo "  ./quick-create.sh customers/acme-roofing.json"
    exit 1
fi

CONFIG_FILE="$1"

if [ ! -f "$CONFIG_FILE" ]; then
    # Try relative to script directory
    if [ -f "$SCRIPT_DIR/$CONFIG_FILE" ]; then
        CONFIG_FILE="$SCRIPT_DIR/$CONFIG_FILE"
    else
        echo -e "${RED}Error: Config file not found: $CONFIG_FILE${NC}"
        exit 1
    fi
fi

# Read values from config
COMPANY_NAME=$(jq -r '.company.name' "$CONFIG_FILE")
REPO_NAME=$(jq -r '.app.repoName // empty' "$CONFIG_FILE")

if [ -z "$REPO_NAME" ]; then
    REPO_NAME=$(echo "$COMPANY_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g')-admin
fi

OUTPUT_DIR="$TEMPLATE_DIR/../$REPO_NAME"

echo ""
echo -e "${BOLD}🚀 Quick Create: $COMPANY_NAME${NC}"
echo "─────────────────────────────────────────"
echo ""

# Check for existing directory
if [ -d "$OUTPUT_DIR" ]; then
    echo -e "${YELLOW}⚠ Directory exists: $OUTPUT_DIR${NC}"
    read -p "Overwrite? [y/N]: " OVERWRITE
    if [[ ! "$OVERWRITE" =~ ^[Yy]$ ]]; then
        exit 1
    fi
    rm -rf "$OUTPUT_DIR"
fi

echo -e "${BLUE}→ Copying template...${NC}"
mkdir -p "$OUTPUT_DIR"
rsync -av "$TEMPLATE_DIR/" "$OUTPUT_DIR/" \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --quiet

echo -e "${BLUE}→ Applying configuration...${NC}"
cp "$CONFIG_FILE" "$OUTPUT_DIR/tools/setup-customer/current-customer.json"
cd "$OUTPUT_DIR"
node tools/setup-customer/setup-customer.js --config tools/setup-customer/current-customer.json

echo -e "${BLUE}→ Initializing git...${NC}"
git init --quiet
git add .
git commit -m "Initial setup for $COMPANY_NAME" --quiet

echo ""
echo -e "${GREEN}✓ Done! Project created at: $OUTPUT_DIR${NC}"
echo ""
echo "Next: cd $OUTPUT_DIR && npm install && npm run dev"
echo ""
