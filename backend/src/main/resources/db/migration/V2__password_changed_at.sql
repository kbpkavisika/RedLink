-- When the user last changed their own password. Tokens issued before this are refused (CurrentUser),
-- so changing a password signs out every other device. NULL = never changed, every unexpired token is valid.
ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMPTZ;
