-- Chat interne : DM, membres, pièces jointes (texte / image / PDF)

ALTER TABLE chat_channels
    ADD COLUMN IF NOT EXISTS channel_type VARCHAR(16) NOT NULL DEFAULT 'GROUP';

ALTER TABLE chat_channels
    ADD COLUMN IF NOT EXISTS created_by BIGINT NULL REFERENCES utilisateurs (id);

UPDATE chat_channels
SET channel_type = 'GROUP'
WHERE channel_type IS NULL OR channel_type = '';

ALTER TABLE chat_channels
    DROP CONSTRAINT IF EXISTS chat_channels_type_check;
ALTER TABLE chat_channels
    ADD CONSTRAINT chat_channels_type_check CHECK (channel_type IN ('GROUP', 'DIRECT'));

CREATE TABLE IF NOT EXISTS chat_channel_members (
    channel_id VARCHAR(64) NOT NULL REFERENCES chat_channels (id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES utilisateurs (id) ON DELETE CASCADE,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_channel_members_user
    ON chat_channel_members (user_id);

-- Tous les utilisateurs actifs rejoignent les 3 groupes seedés
INSERT INTO chat_channel_members (channel_id, user_id)
SELECT c.id, u.id
FROM chat_channels c
CROSS JOIN utilisateurs u
WHERE c.id IN ('accueil-medecins', 'techniciens-medecins', 'general')
  AND c.channel_type = 'GROUP'
  AND u.deleted_at IS NULL
ON CONFLICT DO NOTHING;

UPDATE chat_channels c
SET members_count = (
    SELECT COUNT(*)::INTEGER FROM chat_channel_members m WHERE m.channel_id = c.id
)
WHERE c.channel_type = 'GROUP';

ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS message_type VARCHAR(16) NOT NULL DEFAULT 'TEXT';

ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS storage_key VARCHAR(255) NULL;

ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS file_name VARCHAR(255) NULL;

ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS file_size BIGINT NULL;

ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS mime_type VARCHAR(120) NULL;

ALTER TABLE chat_messages
    DROP CONSTRAINT IF EXISTS chat_messages_body_not_blank;

ALTER TABLE chat_messages
    ALTER COLUMN body DROP NOT NULL;

UPDATE chat_messages SET message_type = 'TEXT' WHERE message_type IS NULL OR message_type = '';

ALTER TABLE chat_messages
    DROP CONSTRAINT IF EXISTS chat_messages_type_check;
ALTER TABLE chat_messages
    ADD CONSTRAINT chat_messages_type_check CHECK (message_type IN ('TEXT', 'IMAGE', 'PDF'));

ALTER TABLE chat_messages
    DROP CONSTRAINT IF EXISTS chat_messages_payload_check;
ALTER TABLE chat_messages
    ADD CONSTRAINT chat_messages_payload_check CHECK (
        (message_type = 'TEXT' AND body IS NOT NULL AND char_length(btrim(body)) > 0 AND storage_key IS NULL)
        OR (message_type IN ('IMAGE', 'PDF') AND storage_key IS NOT NULL AND file_name IS NOT NULL)
    );
