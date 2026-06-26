#!/usr/bin/env python3
"""
Garmin sync fallback — uses the Python garminconnect library to push data
directly to the Neon DB. Run this when the npm garmin-connect sync fails.

Usage:
  GARMIN_EMAIL=your@email.com GARMIN_PASSWORD=yourpass python3 scripts/garmin_sync.py
  GARMIN_EMAIL=... GARMIN_PASSWORD=... GARMIN_DAYS=90 python3 scripts/garmin_sync.py  # full backfill

Schedule (macOS):
  crontab -e
  0 8 * * * GARMIN_EMAIL=your@email GARMIN_PASSWORD=yourpass \
    /Users/dominic.marsh/code/us-loans-product-servicing/.venv/bin/python3 \
    /Users/dominic.marsh/code/bpm/scripts/garmin_sync.py >> /tmp/garmin_sync.log 2>&1
"""

import os
import sys
from datetime import datetime, timedelta

import psycopg2
from garminconnect import Garmin

DB_URL = "postgresql://neondb_owner:npg_co1NZgdbmqF9@ep-restless-violet-adyfezmk-pooler.c-2.us-east-1.aws.neon.tech/bpm?sslmode=require"
USER_ID = "cmqt6gh3d0000hgmaeo34fek1"

GARMIN_EMAIL = os.environ.get("GARMIN_EMAIL", "")
GARMIN_PASSWORD = os.environ.get("GARMIN_PASSWORD", "")
DAYS = int(os.environ.get("GARMIN_DAYS", "2"))


def main():
    if not GARMIN_EMAIL or not GARMIN_PASSWORD:
        print("Set GARMIN_EMAIL and GARMIN_PASSWORD env vars", file=sys.stderr)
        sys.exit(1)

    print(f"Logging in to Garmin Connect as {GARMIN_EMAIL}…")
    client = Garmin(GARMIN_EMAIL, GARMIN_PASSWORD)
    client.login()
    print("Login OK")

    readings = []

    for i in range(DAYS):
        date = datetime.now() - timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")
        day_count = 0

        # Heart rate
        try:
            hr = client.get_heart_rates(date_str)
            for ts, val in (hr.get("heartRateValues") or []):
                if val is not None:
                    readings.append({
                        "timestamp": datetime.fromtimestamp(ts / 1000),
                        "heartRate": int(val),
                        "stressScore": None,
                        "bodyBattery": None,
                    })
                    day_count += 1
        except Exception as e:
            print(f"  HR failed {date_str}: {e}")

        # Stress
        try:
            stress = client.get_stress_data(date_str)
            for ts, val in (stress.get("stressValuesArray") or []):
                if val is not None and val >= 0:
                    readings.append({
                        "timestamp": datetime.fromtimestamp(ts / 1000),
                        "heartRate": None,
                        "stressScore": int(val),
                        "bodyBattery": None,
                    })
                    day_count += 1
        except Exception as e:
            print(f"  Stress failed {date_str}: {e}")

        # Body battery
        try:
            bb_list = client.get_body_battery(date_str)
            for entry in (bb_list or []):
                for ts, val in (entry.get("bodyBatteryValuesArray") or []):
                    if val is not None:
                        readings.append({
                            "timestamp": datetime.fromtimestamp(ts / 1000),
                            "heartRate": None,
                            "stressScore": None,
                            "bodyBattery": int(val),
                        })
                        day_count += 1
        except Exception as e:
            print(f"  Body battery failed {date_str}: {e}")

        print(f"  {date_str}: {day_count} readings")

    if not readings:
        print("No readings fetched — nothing to insert")
        return

    print(f"\nInserting {len(readings)} readings into Neon…")

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    # Delete existing readings for the sync window
    cutoff = datetime.now() - timedelta(days=DAYS)
    cur.execute(
        'DELETE FROM "BiometricReading" WHERE "userId" = %s AND "timestamp" >= %s',
        (USER_ID, cutoff),
    )
    deleted = cur.rowcount
    print(f"Deleted {deleted} stale readings")

    for r in readings:
        cur.execute(
            """
            INSERT INTO "BiometricReading" ("id", "userId", "timestamp", "heartRate", "stressScore", "bodyBattery", "hrv")
            VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s, NULL)
            """,
            (USER_ID, r["timestamp"], r["heartRate"], r["stressScore"], r["bodyBattery"]),
        )

    # Update lastSyncAt
    cur.execute(
        'UPDATE "GarminCredential" SET "lastSyncAt" = NOW() WHERE "userId" = %s',
        (USER_ID,),
    )

    conn.commit()
    conn.close()
    print(f"Done — {len(readings)} readings inserted")


if __name__ == "__main__":
    main()
