-- Premium schema: version tracking for US Regulations MCP
-- Applied on top of the standard database to enable premium tools.

CREATE TABLE IF NOT EXISTS section_versions (
  id INTEGER PRIMARY KEY,
  section_id INTEGER NOT NULL,
  body_text TEXT NOT NULL,
  effective_date TEXT,            -- when this version took effect legally
  superseded_date TEXT,           -- when next version replaced it (NULL = current)
  scraped_at TEXT NOT NULL,       -- when we captured this snapshot
  change_summary TEXT,            -- AI-generated plain-language summary of what changed
  diff_from_previous TEXT,        -- unified diff against prior version
  source_url TEXT,                -- link to official source document
  FOREIGN KEY (section_id) REFERENCES sections(rowid)
);

CREATE INDEX IF NOT EXISTS idx_sv_section ON section_versions(section_id);
CREATE INDEX IF NOT EXISTS idx_sv_effective ON section_versions(effective_date);
