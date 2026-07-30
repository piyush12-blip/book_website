#!/usr/bin/env bash
cd "$(dirname "$0")"
echo "Starting Bibliotheque on http://localhost:8000"
python3 -m http.server 8000
