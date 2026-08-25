package com.crm.medicare.common;

import java.time.ZoneId;

/** Fuseau métier unique du centre (MediCare). */
public final class CentreZone {

    public static final String ID = "Africa/Casablanca";
    public static final ZoneId ZONE = ZoneId.of(ID);

    private CentreZone() {}
}
