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
    
    # Check if node_modules exists; do not install automatically to avoid
    # creating root-owned files or mutating the working tree from this script.
    # Dependencies must be installed before running this script.
    if [ ! -d "node_modules" ]; then
        echo "ERROR: node_modules not found in TreeGuardiansExpo."
        echo "Please install JS/Expo dependencies before running this script, e.g.:"
        echo "  (cd TreeGuardiansExpo && npm ci)"
        exit 1
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
