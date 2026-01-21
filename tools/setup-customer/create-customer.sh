#!/bin/bash

#######################################################################
# CREATE NEW CUSTOMER - One-Click Setup Script
#
# Usage:
#   ./create-customer.sh
#
# This script will:
#   1. Prompt for all customer details
#   2. Create a new directory with the customer name
#   3. Copy all template files
#   4. Run the setup-customer.js tool
#   5. Initialize git and optionally create GitHub repo
#######################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║     🏗️  CREATE NEW CUSTOMER - One-Click Setup               ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to prompt with default value
prompt() {
    local prompt_text="$1"
    local default_value="$2"
    local var_name="$3"

    if [ -n "$default_value" ]; then
        read -p "$(echo -e "${CYAN}?${NC} ${prompt_text} [${default_value}]: ")" input
        eval "$var_name=\"${input:-$default_value}\""
    else
        read -p "$(echo -e "${CYAN}?${NC} ${prompt_text}: ")" input
        eval "$var_name=\"$input\""
    fi
}

# Function to prompt for required field
prompt_required() {
    local prompt_text="$1"
    local var_name="$2"
    local value=""

    while [ -z "$value" ]; do
        read -p "$(echo -e "${CYAN}?${NC} ${prompt_text} ${RED}(required)${NC}: ")" value
        if [ -z "$value" ]; then
            echo -e "${RED}  This field is required. Please enter a value.${NC}"
        fi
    done
    eval "$var_name=\"$value\""
}

echo -e "${BOLD}📋 COMPANY INFORMATION${NC}"
echo ""

prompt_required "Company name (e.g., 'Bay Area Roofing')" "COMPANY_NAME"
prompt "Legal name" "${COMPANY_NAME}, LLC" "LEGAL_NAME"

# Generate short name from company name (remove common words)
DEFAULT_SHORT_NAME=$(echo "$COMPANY_NAME" | sed 's/^The //i' | sed 's/ Inc\.//i' | sed 's/ LLC//i' | sed 's/ Co\.//i')
prompt "Short name" "$DEFAULT_SHORT_NAME" "SHORT_NAME"

prompt "Tagline (optional)" "" "TAGLINE"
prompt_required "Phone number (e.g., '(415) 555-1234')" "PHONE"
prompt_required "Email address" "EMAIL"
prompt "Website URL" "https://www.example.com" "WEBSITE_URL"
prompt "License number (e.g., 'CA License #1234567')" "" "LICENSE"

echo ""
echo -e "${BOLD}📍 ADDRESS${NC}"
echo ""

prompt_required "Street address" "STREET"
prompt_required "City" "CITY"
prompt "State" "CA" "STATE"
prompt_required "ZIP code" "ZIP"
prompt "Service region (e.g., 'San Francisco Bay Area')" "$CITY Area" "REGION"

echo ""
echo -e "${BOLD}🔧 SUPABASE CONFIGURATION${NC}"
echo ""

prompt_required "Supabase Project ID" "SUPABASE_PROJECT_ID"
prompt_required "Supabase Publishable Key (anon key)" "SUPABASE_KEY"

echo ""
echo -e "${BOLD}🎨 BRANDING${NC}"
echo ""

prompt "Primary color HSL (e.g., '205 50% 21%')" "205 50% 21%" "PRIMARY_COLOR"
prompt "Accent color HSL (e.g., '25 95% 55%')" "25 95% 55%" "ACCENT_COLOR"
prompt "Theme color hex (e.g., '#0b3040')" "#0b3040" "THEME_COLOR"

echo ""
echo -e "${BOLD}📁 PROJECT SETUP${NC}"
echo ""

# Generate repo name from company name
DEFAULT_REPO_NAME=$(echo "$COMPANY_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g')
prompt "GitHub repo name" "$DEFAULT_REPO_NAME-admin" "REPO_NAME"

# Generate app ID
DEFAULT_APP_ID="app.$(echo "$DEFAULT_REPO_NAME" | tr '-' '.').admin"
prompt "Capacitor App ID" "$DEFAULT_APP_ID" "APP_ID"

prompt "Output directory" "../$REPO_NAME" "OUTPUT_DIR"

# Resolve output directory to absolute path
if [[ "$OUTPUT_DIR" != /* ]]; then
    OUTPUT_DIR="$(cd "$TEMPLATE_DIR" && cd "$(dirname "$OUTPUT_DIR")" && pwd)/$(basename "$OUTPUT_DIR")"
fi

echo ""
echo -e "${BOLD}📝 CONFIGURATION SUMMARY${NC}"
echo "─────────────────────────────────────────────────────────────"
echo -e "  Company:        ${GREEN}$COMPANY_NAME${NC}"
echo -e "  Phone:          ${GREEN}$PHONE${NC}"
echo -e "  Email:          ${GREEN}$EMAIL${NC}"
echo -e "  Location:       ${GREEN}$CITY, $STATE${NC}"
echo -e "  Supabase ID:    ${GREEN}$SUPABASE_PROJECT_ID${NC}"
echo -e "  Output:         ${GREEN}$OUTPUT_DIR${NC}"
echo -e "  Repo Name:      ${GREEN}$REPO_NAME${NC}"
echo "─────────────────────────────────────────────────────────────"
echo ""

read -p "$(echo -e "${YELLOW}?${NC} Proceed with setup? [Y/n]: ")" CONFIRM
CONFIRM=${CONFIRM:-Y}

if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo -e "${RED}Setup cancelled.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}→ Creating project directory...${NC}"

# Check if output directory exists
if [ -d "$OUTPUT_DIR" ]; then
    echo -e "${YELLOW}⚠ Directory already exists: $OUTPUT_DIR${NC}"
    read -p "$(echo -e "${YELLOW}?${NC} Overwrite? [y/N]: ")" OVERWRITE
    if [[ ! "$OVERWRITE" =~ ^[Yy]$ ]]; then
        echo -e "${RED}Setup cancelled.${NC}"
        exit 1
    fi
    rm -rf "$OUTPUT_DIR"
fi

# Create new project directory
mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}→ Copying template files...${NC}"

# Copy all files except .git, node_modules, and dist
rsync -av --progress "$TEMPLATE_DIR/" "$OUTPUT_DIR/" \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.env.local' \
    --exclude '*.log' \
    --quiet

echo -e "${GREEN}✓ Template copied${NC}"

# Generate config JSON
CONFIG_FILE="$OUTPUT_DIR/tools/setup-customer/current-customer.json"

echo -e "${BLUE}→ Generating customer configuration...${NC}"

# Clean phone number for phoneRaw
PHONE_RAW=$(echo "$PHONE" | tr -cd '0-9')
if [[ ! "$PHONE_RAW" =~ ^\+?1 ]]; then
    PHONE_RAW="+1$PHONE_RAW"
else
    PHONE_RAW="+$PHONE_RAW"
fi

cat > "$CONFIG_FILE" << EOF
{
  "company": {
    "name": "$COMPANY_NAME",
    "legalName": "$LEGAL_NAME",
    "shortName": "$SHORT_NAME",
    "tagline": "$TAGLINE",
    "description": "$SHORT_NAME provides professional construction services in the $REGION.",
    "phone": "$PHONE",
    "phoneRaw": "$PHONE_RAW",
    "email": "$EMAIL",
    "websiteUrl": "$WEBSITE_URL",
    "licenseNumber": "$LICENSE",
    "address": {
      "street": "$STREET",
      "city": "$CITY",
      "state": "$STATE",
      "zip": "$ZIP",
      "region": "$REGION"
    },
    "hours": {
      "weekdays": "Mon - Fri: 8AM - 5PM",
      "weekends": "Weekends: By Appointment",
      "emergency": "24/7 Emergency Service"
    },
    "serviceAreas": [
      "$CITY"
    ],
    "social": {},
    "coordinates": {}
  },
  "branding": {
    "colors": {
      "primary": "$PRIMARY_COLOR",
      "accent": "$ACCENT_COLOR",
      "themeColor": "$THEME_COLOR"
    }
  },
  "supabase": {
    "projectId": "$SUPABASE_PROJECT_ID",
    "publishableKey": "$SUPABASE_KEY",
    "url": "https://$SUPABASE_PROJECT_ID.supabase.co"
  },
  "app": {
    "appId": "$APP_ID",
    "repoName": "$REPO_NAME"
  }
}
EOF

echo -e "${GREEN}✓ Configuration generated${NC}"

echo -e "${BLUE}→ Running setup tool...${NC}"

# Run the setup tool
cd "$OUTPUT_DIR"
node tools/setup-customer/setup-customer.js --config tools/setup-customer/current-customer.json

echo -e "${BLUE}→ Initializing git repository...${NC}"

# Initialize git
git init --quiet
git add .
git commit -m "Initial setup for $COMPANY_NAME

Auto-generated by create-customer.sh

Co-Authored-By: Claude <noreply@anthropic.com>" --quiet

echo -e "${GREEN}✓ Git initialized${NC}"

# Ask about GitHub repo creation
echo ""
read -p "$(echo -e "${CYAN}?${NC} Create GitHub repository? [Y/n]: ")" CREATE_REPO
CREATE_REPO=${CREATE_REPO:-Y}

if [[ "$CREATE_REPO" =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}→ Creating GitHub repository...${NC}"

    read -p "$(echo -e "${CYAN}?${NC} GitHub organization (leave empty for personal): ")" GH_ORG
    read -p "$(echo -e "${CYAN}?${NC} Make repository private? [Y/n]: ")" PRIVATE
    PRIVATE=${PRIVATE:-Y}

    PRIVATE_FLAG=""
    if [[ "$PRIVATE" =~ ^[Yy]$ ]]; then
        PRIVATE_FLAG="--private"
    else
        PRIVATE_FLAG="--public"
    fi

    if [ -n "$GH_ORG" ]; then
        gh repo create "$GH_ORG/$REPO_NAME" $PRIVATE_FLAG --source=. --push
    else
        gh repo create "$REPO_NAME" $PRIVATE_FLAG --source=. --push
    fi

    echo -e "${GREEN}✓ GitHub repository created and pushed${NC}"
fi

echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✓ Customer setup complete!${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}Project location:${NC} $OUTPUT_DIR"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo -e "  1. Add customer logo:   ${CYAN}cp logo.png $OUTPUT_DIR/public/lovable-uploads/${NC}"
echo -e "  2. Update app icons:    ${CYAN}$OUTPUT_DIR/public/icons/${NC}"
echo -e "  3. Test locally:        ${CYAN}cd $OUTPUT_DIR && npm install && npm run dev${NC}"
echo ""
