# F1 Analytics Platform

Formula 1 data platform for ingesting, processing, and visualizing race data using Python, PostgreSQL, Node.js, and React.

---

##  Overview

This project ingests raw telemetry data from the OpenF1 API, processes it into analytics-ready tables, and exposes it through a REST API with a frontend dashboard.

### Architecture

* **Pipeline (Python):** Data ingestion & processing
* **Database (PostgreSQL):** Raw + analytics layers
* **API (Node.js / Express):** Serves analytics data
* **Frontend (React + Vite):** Visualization dashboard
