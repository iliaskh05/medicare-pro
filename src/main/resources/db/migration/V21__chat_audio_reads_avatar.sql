-- Chat AUDIO + unread + avatar profil

ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NULL;

ALTER TABLE chat_messages
    DROP CONSTRAINT IF EXISTS chat_messages_type_check;
ALTER TABLE chat_messages
    ADD CONSTRAINT chat_messages_type_check CHECK (message_type IN ('TEXT', 'IMAGE', 'PDF', 'AUDIO'));

ALTER TABLE chat_messages
    DROP CONSTRAINT IF EXISTS chat_messages_payload_check;
ALTER TABLE chat_messages
    ADD CONSTRAINT chat_messages_payload_check CHECK (
        (message_type = 'TEXT' AND body IS NOT NULL AND char_length(btrim(body)) > 0 AND storage_key IS NULL)
        OR (message_type IN ('IMAGE', 'PDF', 'AUDIO') AND storage_key IS NOT NULL AND file_name IS NOT NULL)
    );

CREATE TABLE IF NOT EXISTS chat_channel_reads (
    user_id BIGINT NOT NULL REFERENCES utilisateurs (id) ON DELETE CASCADE,
    channel_id VARCHAR(64) NOT NULL REFERENCES chat_channels (id) ON DELETE CASCADE,
    last_read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_channel_reads_channel
    ON chat_channel_reads (channel_id);

ALTER TABLE utilisateurs
    ADD COLUMN IF NOT EXISTS avatar_storage_key VARCHAR(255) NULL;
