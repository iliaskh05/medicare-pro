package com.crm.medicare.data;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class MoroccanCatalogueDefinitionsTest {

    @Test
    void catalogueHasAtLeastSixtyUniqueCodes() {
        List<MoroccanCatalogueDefinitions.Def> all = MoroccanCatalogueDefinitions.all();
        assertThat(all).hasSizeGreaterThanOrEqualTo(60);

        Set<String> codes = new HashSet<>();
        for (MoroccanCatalogueDefinitions.Def def : all) {
            assertThat(def.code()).isNotBlank();
            assertThat(codes.add(def.code())).as("duplicate code %s", def.code()).isTrue();
            assertThat(def.toWriteRequest().getNationalReferencePrice()).isNull();
            assertThat(def.toWriteRequest().getMarketIndicative()).isTrue();
        }
        assertThat(codes).hasSizeGreaterThanOrEqualTo(60);
    }
}
