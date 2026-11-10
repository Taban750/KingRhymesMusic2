-- Visitor tracking is used by the public site and the admin analytics panel.
CREATE TABLE IF NOT EXISTS visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path varchar(255) NOT NULL,
  user_agent text,
  ip varchar(64),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS visitors_created_at_idx ON visitors (created_at DESC);
CREATE INDEX IF NOT EXISTS visitors_path_idx ON visitors (path);
