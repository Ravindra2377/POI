# Ingestion workers

State-by-State source-specific acquisition adapters live here. Each adapter must save an
immutable raw snapshot before emitting extraction work and must comply with the source
registry gate.

## `daily_news_ingestor.py`

State-by-State automated daily news and press release ingestion worker. It iterates the
per-state feed registry in `apps/api/app/ingestion/state_feeds.py` (all 28 States and 8
Union Territories, each anchored to its official PIB regional bureau RSS feed), fetches
each registered feed, stores the raw snapshot, and extracts typed observations.

Run the CLI equivalent for one state or all states:

```bash
# All 36 States and Union Territories
python -m app.commands.ingest_daily_news

# A single State or Union Territory
python -m app.commands.ingest_daily_news --state IN-AP
```
