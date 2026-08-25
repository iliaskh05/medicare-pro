package com.crm.medicare.storage;

import java.io.IOException;
import java.io.InputStream;

/** Abstraction stockage documents (local, S3, …). */
public interface DocumentStorage {

    /** Persiste le contenu et retourne une clé de stockage opaque (pas un path client). */
    String store(String suggestedFileName, String contentType, InputStream content, long size)
            throws IOException;

    byte[] load(String storageKey) throws IOException;

    void delete(String storageKey) throws IOException;
}
