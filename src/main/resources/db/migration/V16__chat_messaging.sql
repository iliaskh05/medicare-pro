-- Messagerie interne du centre (canaux + messages)
CREATE TABLE IF NOT EXISTS chat_channels (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500) NOT NULL DEFAULT '',
    members_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    channel_id VARCHAR(64) NOT NULL REFERENCES chat_channels (id) ON DELETE CASCADE,
    author_id BIGINT NOT NULL REFERENCES utilisateurs (id),
    author_name VARCHAR(180) NOT NULL,
    author_role VARCHAR(64) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chat_messages_body_not_blank CHECK (char_length(btrim(body)) > 0),
    CONSTRAINT chat_messages_body_max CHECK (char_length(body) <= 4000)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created
    ON chat_messages (channel_id, created_at ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_author
    ON chat_messages (author_id);

INSERT INTO chat_channels (id, name, description, members_count)
VALUES
    (
        'accueil-medecins',
        'Accueil - Médecins',
        'Coordination des rendez-vous, prescriptions et urgences patients',
        0
    ),
    (
        'techniciens-medecins',
        'Techniciens - Médecins',
        'Qualité des acquisitions, protocoles et reprises de séries',
        0
    ),
    (
        'general',
        'Général',
        'Annonces du centre et organisation interne',
        0
    )
ON CONFLICT (id) DO NOTHING;
