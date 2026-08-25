package com.crm.medicare.data;

import com.crm.medicare.dto.CatalogueExamenWriteRequest;
import java.math.BigDecimal;
import java.util.List;

/**
 * Indicative Moroccan private-sector radiology catalogue for demo / centre baseline.
 *
 * <p><strong>Not</strong> official ANAM national tariffs. Prices are market-indicative MAD
 * ranges editable by each centre. {@code nationalReferencePrice} is left null.
 */
public final class MoroccanCatalogueDefinitions {

    private MoroccanCatalogueDefinitions() {}

    public record Def(
            String code,
            String nom,
            String modalite,
            String categorie,
            String bodyRegion,
            int dureeMinutes,
            BigDecimal prix,
            boolean contrastRequired,
            String contrastType,
            boolean sedationRequired,
            String description,
            String preparation) {

        public CatalogueExamenWriteRequest toWriteRequest() {
            CatalogueExamenWriteRequest req = new CatalogueExamenWriteRequest();
            req.setCode(code);
            req.setNom(nom);
            req.setModalite(modalite);
            req.setCategorie(categorie);
            req.setBodyRegion(bodyRegion);
            req.setDureeMinutes(dureeMinutes);
            req.setPrix(prix);
            req.setCurrency("MAD");
            req.setNationalReferencePrice(null);
            req.setMarketIndicative(true);
            req.setContrastRequired(contrastRequired);
            req.setContrastType(contrastType);
            req.setSedationRequired(sedationRequired);
            req.setDescription(description);
            req.setPreparation(preparation);
            req.setActif(true);
            return req;
        }
    }

    private static Def d(
            String code,
            String nom,
            String modalite,
            String categorie,
            String bodyRegion,
            int duree,
            String prix,
            boolean contrast,
            String contrastType,
            boolean sedation,
            String description,
            String preparation) {
        return new Def(
                code,
                nom,
                modalite,
                categorie,
                bodyRegion,
                duree,
                new BigDecimal(prix),
                contrast,
                contrastType,
                sedation,
                description,
                preparation);
    }

    public static List<Def> all() {
        return List.of(
                // —— Radiographie ——
                d("XR-THORAX-FACE", "Radiographie thorax face", "Radiologie", "RADIOGRAPHIE", "Thorax", 10, "150.00", false, null, false,
                        "Radiographie thoracique de face — tarif indicatif marché.", "Retirer bijoux / métaux du thorax."),
                d("XR-THORAX-FACE-PROFIL", "Radiographie thorax face + profil", "Radiologie", "RADIOGRAPHIE", "Thorax", 15, "220.00", false, null, false,
                        "Radiographie thoracique face et profil.", "Retirer bijoux / métaux du thorax."),
                d("XR-RACHIS-CERV", "Radiographie rachis cervical", "Radiologie", "RADIOGRAPHIE", "Rachis", 15, "200.00", false, null, false,
                        "Clichés du rachis cervical.", null),
                d("XR-RACHIS-DORS", "Radiographie rachis dorsal", "Radiologie", "RADIOGRAPHIE", "Rachis", 15, "200.00", false, null, false,
                        "Clichés du rachis dorsal.", null),
                d("XR-RACHIS-LOMB", "Radiographie rachis lombaire", "Radiologie", "RADIOGRAPHIE", "Rachis", 15, "220.00", false, null, false,
                        "Clichés du rachis lombaire.", null),
                d("XR-BASSIN", "Radiographie bassin", "Radiologie", "RADIOGRAPHIE", "Bassin", 10, "180.00", false, null, false,
                        "Radiographie du bassin.", null),
                d("XR-HANCHE", "Radiographie hanche", "Radiologie", "RADIOGRAPHIE", "Hanche", 10, "160.00", false, null, false,
                        "Radiographie de hanche.", null),
                d("XR-GENOU", "Radiographie genou", "Radiologie", "RADIOGRAPHIE", "Genou", 10, "150.00", false, null, false,
                        "Radiographie de genou.", null),
                d("XR-CHEVILLE", "Radiographie cheville", "Radiologie", "RADIOGRAPHIE", "Cheville", 10, "140.00", false, null, false,
                        "Radiographie de cheville.", null),
                d("XR-POIGNET", "Radiographie poignet", "Radiologie", "RADIOGRAPHIE", "Poignet", 10, "140.00", false, null, false,
                        "Radiographie de poignet.", null),
                d("XR-MAIN", "Radiographie main", "Radiologie", "RADIOGRAPHIE", "Main", 10, "130.00", false, null, false,
                        "Radiographie de la main.", null),
                d("XR-PIED", "Radiographie pied", "Radiologie", "RADIOGRAPHIE", "Pied", 10, "130.00", false, null, false,
                        "Radiographie du pied.", null),
                d("XR-SINUS", "Radiographie sinus", "Radiologie", "RADIOGRAPHIE", "Sinus", 10, "160.00", false, null, false,
                        "Radiographie des sinus.", null),
                d("XR-ABDOMEN", "Radiographie abdomen sans préparation", "Radiologie", "RADIOGRAPHIE", "Abdomen", 10, "180.00", false, null, false,
                        "ASP — abdomen sans préparation.", null),
                d("XR-EPAULE", "Radiographie épaule", "Radiologie", "RADIOGRAPHIE", "Épaule", 10, "150.00", false, null, false,
                        "Radiographie d'épaule.", null),
                d("XR-COUDE", "Radiographie coude", "Radiologie", "RADIOGRAPHIE", "Coude", 10, "140.00", false, null, false,
                        "Radiographie de coude.", null),
                d("XR-CRANE", "Radiographie crâne", "Radiologie", "RADIOGRAPHIE", "Crâne", 10, "170.00", false, null, false,
                        "Radiographie du crâne.", null),

                // —— Échographie ——
                d("US-ABD", "Échographie abdominale", "Échographie", "ECHOGRAPHIE", "Abdomen", 20, "450.00", false, null, false,
                        "Échographie abdominale complète.", "Jeûne 6 h recommandé."),
                d("US-PELVIEN", "Échographie pelvienne", "Échographie", "ECHOGRAPHIE", "Pelvis", 20, "400.00", false, null, false,
                        "Échographie pelvienne.", "Vessie pleine si voie sus-pubienne."),
                d("US-RENAL", "Échographie rénale", "Échographie", "ECHOGRAPHIE", "Rein", 15, "350.00", false, null, false,
                        "Échographie des reins.", "Bonne hydratation."),
                d("US-THYROID", "Échographie thyroïdienne", "Échographie", "ECHOGRAPHIE", "Thyroïde", 15, "350.00", false, null, false,
                        "Échographie de la thyroïde.", null),
                d("US-HEPATO-BIL", "Échographie hépato-biliaire", "Échographie", "ECHOGRAPHIE", "Foie", 20, "400.00", false, null, false,
                        "Échographie foie / voies biliaires.", "Jeûne 6 h."),
                d("US-URINARY", "Échographie appareil urinaire", "Échographie", "ECHOGRAPHIE", "Urinaire", 20, "400.00", false, null, false,
                        "Échographie urinaire (reins, vessie).", "Vessie pleine."),
                d("US-OBST-T1", "Échographie obstétricale T1", "Échographie", "ECHOGRAPHIE", "Obstétrique", 25, "500.00", false, null, false,
                        "Échographie du premier trimestre.", null),
                d("US-OBST-T2", "Échographie obstétricale T2", "Échographie", "ECHOGRAPHIE", "Obstétrique", 30, "600.00", false, null, false,
                        "Échographie morphologique du 2e trimestre.", null),
                d("US-OBST-T3", "Échographie obstétricale T3", "Échographie", "ECHOGRAPHIE", "Obstétrique", 25, "550.00", false, null, false,
                        "Échographie du troisième trimestre.", null),
                d("US-SEIN", "Échographie mammaire", "Échographie", "ECHOGRAPHIE", "Sein", 20, "450.00", false, null, false,
                        "Échographie mammaire uni- ou bilatérale.", null),
                d("US-MUSCULO", "Échographie musculo-squelettique", "Échographie", "ECHOGRAPHIE", "MSK", 20, "400.00", false, null, false,
                        "Échographie articulaire / tendineuse.", null),
                d("US-SCROTALE", "Échographie scrotale", "Échographie", "ECHOGRAPHIE", "Scrotum", 15, "350.00", false, null, false,
                        "Échographie scrotale.", null),
                d("US-PARTIES-MOLLES", "Échographie parties molles", "Échographie", "ECHOGRAPHIE", "Parties molles", 15, "300.00", false, null, false,
                        "Échographie des parties molles.", null),

                // —— Doppler (modalité Échographie) ——
                d("DOPPLER-CAROTID", "Doppler carotidien", "Échographie", "DOPPLER", "Cou", 25, "700.00", false, null, false,
                        "Doppler des axes carotidiens.", null),
                d("DOPPLER-VEINEUX-MI", "Doppler veineux membres inférieurs", "Échographie", "DOPPLER", "MI", 30, "750.00", false, null, false,
                        "Doppler veineux des MI.", null),
                d("DOPPLER-ARTERIEL-MI", "Doppler artériel membres inférieurs", "Échographie", "DOPPLER", "MI", 30, "800.00", false, null, false,
                        "Doppler artériel des MI.", null),
                d("DOPPLER-RENAL", "Doppler rénal", "Échographie", "DOPPLER", "Rein", 25, "700.00", false, null, false,
                        "Doppler des artères rénales.", "Jeûne léger recommandé."),
                d("DOPPLER-AORTIQUE", "Doppler aortique", "Échographie", "DOPPLER", "Aorte", 20, "650.00", false, null, false,
                        "Doppler de l'aorte abdominale.", "Jeûne 6 h."),
                d("DOPPLER-PORTAL", "Doppler portal", "Échographie", "DOPPLER", "Foie", 25, "700.00", false, null, false,
                        "Étude Doppler du système porte.", "Jeûne 6 h."),
                d("DOPPLER-OBST", "Doppler obstétrical", "Échographie", "DOPPLER", "Obstétrique", 25, "650.00", false, null, false,
                        "Doppler fœto-maternel.", null),

                // —— Mammographie ——
                d("MAMMO-BILAT", "Mammographie bilatérale de dépistage", "Mammographie", "MAMMOGRAPHIE", "Sein", 20, "450.00", false, null, false,
                        "Mammographie de dépistage bilatérale.", "Éviter déodorants / talc le jour de l'examen."),
                d("MAMMO-DIAG", "Mammographie diagnostique", "Mammographie", "MAMMOGRAPHIE", "Sein", 25, "550.00", false, null, false,
                        "Mammographie diagnostique avec clichés complémentaires.", "Apporter examens antérieurs."),
                d("MAMMO-TOMO", "Mammographie numérique / tomosynthèse", "Mammographie", "MAMMOGRAPHIE", "Sein", 25, "750.00", false, null, false,
                        "Mammographie avec tomosynthèse (si équipement disponible).", "Éviter déodorants / talc."),

                // —— Scanner / CT ——
                d("CT-CRANE", "Scanner cérébral sans injection", "Scanner", "SCANNER", "Crâne", 15, "900.00", false, null, false,
                        "TDM cérébrale sans contraste.", null),
                d("CT-CRANE-CONTRASTE", "Scanner cérébral avec injection", "Scanner", "SCANNER", "Crâne", 20, "1400.00", true, "Iode IV", false,
                        "TDM cérébrale avec contraste iodé.", "Créatinine récente ; jeûne 4 h."),
                d("CT-SINUS", "Scanner des sinus", "Scanner", "SCANNER", "Sinus", 15, "850.00", false, null, false,
                        "TDM des sinus de la face.", null),
                d("CT-THORAX", "Scanner thoracique sans injection", "Scanner", "SCANNER", "Thorax", 15, "1100.00", false, null, false,
                        "TDM thoracique sans contraste.", null),
                d("CT-THORAX-CONTRASTE", "Scanner thoracique avec injection", "Scanner", "SCANNER", "Thorax", 20, "1600.00", true, "Iode IV", false,
                        "TDM thoracique avec contraste.", "Créatinine récente ; jeûne 4 h."),
                d("CT-ABDOMEN", "Scanner abdominal", "Scanner", "SCANNER", "Abdomen", 20, "1500.00", true, "Iode IV", false,
                        "TDM abdominale (souvent avec contraste).", "Jeûne 4–6 h ; créatinine."),
                d("CT-ABDO-PELVIEN", "Scanner abdomino-pelvien", "Scanner", "SCANNER", "Abdomen-Pelvis", 25, "1800.00", true, "Iode IV", false,
                        "TDM abdomino-pelvienne.", "Jeûne 4–6 h ; créatinine."),
                d("CT-THORACO-ABDOMINO-PELVIEN", "Scanner thoraco-abdomino-pelvien", "Scanner", "SCANNER", "TAP", 30, "2200.00", true, "Iode IV", false,
                        "TDM TAP.", "Jeûne 4–6 h ; créatinine."),
                d("CT-RACHIS-CERV", "Scanner rachis cervical", "Scanner", "SCANNER", "Rachis", 15, "1000.00", false, null, false,
                        "TDM du rachis cervical.", null),
                d("CT-RACHIS-LOMB", "Scanner rachis lombaire", "Scanner", "SCANNER", "Rachis", 15, "1000.00", false, null, false,
                        "TDM du rachis lombaire.", null),
                d("CT-BASSIN", "Scanner bassin", "Scanner", "SCANNER", "Bassin", 15, "1100.00", false, null, false,
                        "TDM du bassin osseux.", null),
                d("CT-ANGIO-CEREBRALE", "Angioscanner cérébral", "Scanner", "SCANNER", "Crâne", 25, "2000.00", true, "Iode IV", false,
                        "Angio-TDM cérébrale.", "Créatinine ; jeûne 4 h."),
                d("CT-ANGIO-PULMONAIRE", "Angioscanner pulmonaire", "Scanner", "SCANNER", "Thorax", 20, "1900.00", true, "Iode IV", false,
                        "Angio-TDM pulmonaire (EP).", "Créatinine ; jeûne 4 h."),
                d("CT-CORONAIRE", "Coroscanner", "Scanner", "SCANNER", "Cœur", 35, "2800.00", true, "Iode IV", false,
                        "Angio-TDM coronaire.", "Préparation cardiaque selon protocole centre."),
                d("UROSCANNER", "Uroscanner", "Scanner", "SCANNER", "Urinaire", 30, "2000.00", true, "Iode IV", false,
                        "Uro-TDM multiphasique.", "Créatinine ; hydratation."),
                d("COLOSCANNER", "Coloscanner / coloscopie virtuelle", "Scanner", "SCANNER", "Côlon", 40, "2400.00", true, "Iode IV", false,
                        "Coloscopie virtuelle.", "Préparation colique selon protocole centre."),
                d("CT-ORL", "Scanner ORL / cou", "Scanner", "SCANNER", "Cou", 20, "1200.00", true, "Iode IV", false,
                        "TDM cervicale / ORL.", "Créatinine si injection."),

                // —— IRM ——
                d("MRI-CEREBRALE", "IRM cérébrale sans injection", "IRM", "IRM", "Crâne", 30, "2200.00", false, null, false,
                        "IRM cérébrale sans contraste.", "Questionnaire IRM (implants, claustrophobie)."),
                d("MRI-CEREBRALE-CONTRASTE", "IRM cérébrale avec injection", "IRM", "IRM", "Crâne", 40, "2800.00", true, "Gadolinium IV", false,
                        "IRM cérébrale avec gadolinium.", "Créatinine ; questionnaire IRM."),
                d("MRI-ANGIO-CEREBRALE", "Angio-IRM cérébrale", "IRM", "IRM", "Crâne", 35, "2600.00", false, null, false,
                        "ARM cérébrale.", "Questionnaire IRM."),
                d("MRI-ANGIO-COU", "Angio-IRM des vaisseaux du cou", "IRM", "IRM", "Cou", 35, "2500.00", false, null, false,
                        "ARM cervicale.", "Questionnaire IRM."),
                d("MRI-RACHIS-CERVICAL", "IRM rachis cervical", "IRM", "IRM", "Rachis", 30, "2300.00", false, null, false,
                        "IRM du rachis cervical.", "Questionnaire IRM."),
                d("MRI-RACHIS-DORSAL", "IRM rachis dorsal", "IRM", "IRM", "Rachis", 30, "2300.00", false, null, false,
                        "IRM du rachis dorsal.", "Questionnaire IRM."),
                d("MRI-RACHIS-LOMBAIRE", "IRM rachis lombaire", "IRM", "IRM", "Rachis", 30, "2300.00", false, null, false,
                        "IRM du rachis lombaire.", "Questionnaire IRM."),
                d("MRI-RACHIS-COMPLET", "IRM rachis complet", "IRM", "IRM", "Rachis", 50, "3500.00", false, null, false,
                        "IRM du rachis entier.", "Questionnaire IRM."),
                d("MRI-EPAULE", "IRM épaule", "IRM", "IRM", "Épaule", 35, "2400.00", false, null, false,
                        "IRM d'épaule.", "Questionnaire IRM."),
                d("MRI-GENOU", "IRM genou", "IRM", "IRM", "Genou", 30, "2300.00", false, null, false,
                        "IRM de genou.", "Questionnaire IRM."),
                d("MRI-CHEVILLE", "IRM cheville", "IRM", "IRM", "Cheville", 30, "2200.00", false, null, false,
                        "IRM de cheville.", "Questionnaire IRM."),
                d("MRI-POIGNET", "IRM poignet", "IRM", "IRM", "Poignet", 30, "2200.00", false, null, false,
                        "IRM de poignet.", "Questionnaire IRM."),
                d("MRI-HANCHE", "IRM hanche", "IRM", "IRM", "Hanche", 35, "2400.00", false, null, false,
                        "IRM de hanche.", "Questionnaire IRM."),
                d("MRI-PELVIS", "IRM pelvis", "IRM", "IRM", "Pelvis", 35, "2500.00", false, null, false,
                        "IRM pelvienne.", "Questionnaire IRM."),
                d("MRI-ABDOMEN", "IRM abdominale", "IRM", "IRM", "Abdomen", 40, "2800.00", false, null, false,
                        "IRM abdominale.", "Jeûne selon protocole ; questionnaire IRM."),
                d("MRI-FOIE", "IRM hépatique", "IRM", "IRM", "Foie", 40, "3000.00", true, "Gadolinium IV", false,
                        "IRM du foie (souvent avec contraste).", "Jeûne ; créatinine ; questionnaire IRM."),
                d("MRI-PELVIENNE", "IRM pelvienne femme", "IRM", "IRM", "Pelvis", 40, "2700.00", false, null, false,
                        "IRM pelvienne gynécologique.", "Questionnaire IRM."),
                d("MRI-PROSTATE", "IRM prostate multiparamétrique", "IRM", "IRM", "Prostate", 45, "3200.00", true, "Gadolinium IV", false,
                        "IRM multiparamétrique de la prostate.", "Préparation selon protocole centre."),
                d("MRI-CARDIAQUE", "IRM cardiaque", "IRM", "IRM", "Cœur", 50, "4000.00", true, "Gadolinium IV", false,
                        "IRM cardiaque.", "Préparation cardiaque ; questionnaire IRM."),
                d("MRI-ENTEROGRAPHIE", "Entéro-IRM", "IRM", "IRM", "Abdomen", 50, "3500.00", true, "Gadolinium IV", false,
                        "Entérographie IRM.", "Préparation intestinale selon protocole."),

                // —— Ostéodensitométrie ——
                d("DEXA-CORPS-ENTIER", "Ostéodensitométrie corps entier", "Radiologie", "OSTEODENSITOMETRIE", "Squelette", 20, "500.00", false, null, false,
                        "Mesure DEXA corps entier — tarif indicatif.", "Éviter produits de contraste récents."),
                d("DEXA-HANCHE-RACHIS", "Ostéodensitométrie hanche + rachis", "Radiologie", "OSTEODENSITOMETRIE", "Os", 20, "450.00", false, null, false,
                        "DEXA hanche et rachis lombaire.", null),

                // —— Spécialisés ——
                d("HYSTEROSALPINGO", "Hystérosalpingographie", "Radiologie", "SPECIALISE", "Pelvis", 30, "900.00", true, "Iode", false,
                        "HSG — examen spécialisé configurable.", "Selon protocole gynécologique du centre."),
                d("SIALOGRAPHIE", "Sialographie", "Radiologie", "SPECIALISE", "Glandes salivaires", 30, "800.00", true, "Iode", false,
                        "Sialographie — protocole centre.", null),
                d("FISTULOGRAPHIE", "Fistulographie", "Radiologie", "SPECIALISE", "Variable", 30, "850.00", true, "Iode", false,
                        "Fistulographie — protocole centre.", null));
    }
}
