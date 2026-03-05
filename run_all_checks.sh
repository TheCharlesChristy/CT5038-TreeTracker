#!/bin/bash
set -e

echo "------------------------------------------------"
echo "Running Pre-commit Checks"
echo "------------------------------------------------"

# 1. SQL Lint
echo ">> Running SQL Lint (Fixing)..."
sqlfluff fix . --dialect mysql --force || { echo "SQL Fix failed"; exit 1; }
sqlfluff lint . --dialect mysql || { echo "SQL Lint failed after fix"; exit 1; }

# 2. PHP Lint
echo ">> Running PHP Lint..."
if [ -n "$(find . -name '*.php' -print -quit)" ]; then
    find . -name "*.php" -print0 | xargs -0 -n1 php -l || { echo "PHP Lint failed"; exit 1; }
else
    echo "No PHP files found."
fi

# exit 0

# 3. JS/Expo Lint
echo ">> Running JS/Expo Lint..."
if [ -d "TreeGuardiansExpo" ]; then
    cd TreeGuardiansExpo
    
    # Check if node_modules exists, otherwise warn or install
    # Since we are mounting the volume, we expect the user to have installed deps
    # But if not, we can try to install (might take time)
    if [ ! -d "node_modules" ]; then
        echo "node_modules not found in TreeGuardiansExpo. Installing dependencies..."
        npm ci
    fi
    
    echo ">> Running Expo Lint (Fixing)..."
    # Try to fix automatically if possible
    npm run lint -- --fix || true 
    # Run lint again to verify (and fail if errors remain)
    npm run lint || { echo "JS Lint failed"; exit 1; }
    
    # Optional: expo doctor as per workflow
    echo ">> Running Expo Doctor..."
    npx expo-doctor || true 
else
    echo "TreeGuardiansExpo directory not found!"
    exit 1
fi

echo "------------------------------------------------"
echo "All checks passed!"
echo "------------------------------------------------"
