#!/bin/bash
# Runs once, when the dbdata volume is first created, against the image's temporary init
# server (socket only, no networking). Changing a password later means ALTER USER, not
# editing the env file. Kept executable, so it runs the same on Linux and Docker Desktop.
#
# Two accounts instead of one:
#   dojo_migrator  can change the schema. Used only by the one-off migrate job.
#   dojo_app       can read and write rows, nothing else. Used by the running app, so a
#                  compromised app server can't drop or alter tables.
# Both must connect over TLS. '%' is any source address: the security group is what limits
# it to the app instance. Use generated passwords without quotes.
set -euo pipefail

MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --protocol=socket -uroot mysql <<SQL
CREATE USER 'dojo_migrator'@'%' IDENTIFIED BY '${DOJO_MIGRATOR_PASSWORD}' REQUIRE SSL;
GRANT ALL PRIVILEGES ON dojo.* TO 'dojo_migrator'@'%';

CREATE USER 'dojo_app'@'%' IDENTIFIED BY '${DOJO_APP_PASSWORD}' REQUIRE SSL;
GRANT SELECT, INSERT, UPDATE, DELETE ON dojo.* TO 'dojo_app'@'%';
SQL
