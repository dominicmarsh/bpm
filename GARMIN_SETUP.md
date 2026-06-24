# Garmin Connect Setup

BPM syncs Garmin data via the `garmin-connect` npm package. Garmin's unofficial API
occasionally breaks. This doc covers the primary path and the Python fallback.

---

## Primary: `garmin-connect` npm package

The app uses [garmin-connect](https://www.npmjs.com/package/garmin-connect) under
`src/lib/garmin.ts`. Your credentials are stored AES-256-GCM encrypted in Neon.

If sync fails with an auth or API error, check:
1. Your Garmin username/password are correct (update via Settings)
2. Garmin Connect hasn't prompted for MFA — log in at connect.garmin.com manually once
3. The package version — run `npm outdated garmin-connect`

---

## Fallback: Python `garminconnect` script

If the npm package is broken, use the Python script to push data directly to the
`/api/ingest` endpoint.

### Setup

```bash
pip install garminconnect
```

### Script

Create `garmin_sync.py`:

```python
import json, requests
from garminconnect import Garmin
from datetime import datetime, timedelta

INGEST_URL = "https://your-bpm-app.vercel.app/api/ingest"
INGEST_SECRET = "your-INGEST_SECRET-value"
USER_ID = "your-prisma-user-cuid"

client = Garmin("your@email.com", "yourpassword")
client.login()

readings = []
for i in range(2):  # last 2 days (incremental) or range(90) for full backfill
    date = datetime.now() - timedelta(days=i)
    date_str = date.strftime("%Y-%m-%d")

    try:
        hr = client.get_heart_rates(date_str)
        for ts, val in (hr.get("heartRateValues") or []):
            if val is not None:
                readings.append({"timestamp": datetime.fromtimestamp(ts/1000).isoformat(), "heartRate": val})
    except Exception as e:
        print(f"HR failed {date_str}: {e}")

    try:
        stress = client.get_stress_data(date_str)
        for ts, val in (stress.get("stressValuesArray") or []):
            if val is not None and val >= 0:
                readings.append({"timestamp": datetime.fromtimestamp(ts/1000).isoformat(), "stressScore": val})
    except Exception as e:
        print(f"Stress failed {date_str}: {e}")

    try:
        bb = client.get_body_battery(date_str)
        for entry in (bb or []):
            for ts, val in (entry.get("bodyBatteryValuesArray") or []):
                readings.append({"timestamp": datetime.fromtimestamp(ts/1000).isoformat(), "bodyBattery": val})
    except Exception as e:
        print(f"BB failed {date_str}: {e}")

res = requests.post(
    INGEST_URL,
    headers={"Authorization": f"Bearer {INGEST_SECRET}", "Content-Type": "application/json"},
    json={"userId": USER_ID, "readings": readings}
)
print(res.json())
```

### Getting your userId

Run this SQL against your Neon database:
```sql
SELECT id, email FROM "User";
```

### Schedule it (macOS cron)

```cron
0 8 * * * /usr/bin/python3 /path/to/garmin_sync.py >> /tmp/garmin_sync.log 2>&1
```
