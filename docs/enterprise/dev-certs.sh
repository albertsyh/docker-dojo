#!/bin/sh
# DEMO ONLY: makes a throwaway internal CA and certificates, so the three instances can be
# tried on one machine. A real deployment gets these from the company PKI or a cloud
# private CA, and the edge gets a certificate from a public CA.
#
#   sh docs/enterprise/dev-certs.sh     -> docs/enterprise/certs/ (gitignored)
set -eu
cd "$(dirname "$0")"

if [ -e certs ]; then
  echo "dev-certs: certs/ already exists. Delete it to make new ones." >&2
  exit 1
fi
mkdir certs
cd certs

openssl req -x509 -newkey rsa:2048 -nodes -days 30 -subj "/CN=Docker Dojo demo internal CA" \
  -keyout internal-ca.key -out internal-ca.crt 2>/dev/null

# issue <file name> <common name> <x509 extensions>
issue() {
  openssl req -newkey rsa:2048 -nodes -subj "/CN=$2" -keyout "$1.key" -out "$1.csr" 2>/dev/null
  printf '%s\n' "$3" > "$1.ext"
  openssl x509 -req -days 30 -in "$1.csr" -CA internal-ca.crt -CAkey internal-ca.key \
    -CAcreateserial -extfile "$1.ext" -out "$1.crt" 2>/dev/null
  rm "$1.csr" "$1.ext"
}

# Data instance. host.docker.internal is only there for trying everything on one machine.
issue db db.internal "subjectAltName=DNS:db.internal,DNS:host.docker.internal
extendedKeyUsage=serverAuth"

# App instance gateway, and the client certificate that proves a caller is the edge.
issue app app.internal "subjectAltName=DNS:app.internal
extendedKeyUsage=serverAuth"
issue edge-client edge "extendedKeyUsage=clientAuth"

# Stand-in for the edge's public certificate. Browsers will warn: it's signed by the demo CA.
issue public localhost "subjectAltName=DNS:localhost
extendedKeyUsage=serverAuth"

# Demo only: lets mysqld (uid 999) and nginx read the keys through bind mounts. Real keys
# are mode 600 and owned by the user of the service that reads them.
chmod 644 ./*.key
rm -f internal-ca.srl
echo "dev-certs: wrote $(pwd)"
