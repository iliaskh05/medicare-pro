package com.crm.medicare.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "imaging_series")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ImagingSeries {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "study_id", nullable = false)
    private ImagingStudy study;

    @Column(name = "series_instance_uid", length = 128)
    private String seriesInstanceUid;

    @Column(name = "series_description", length = 512)
    private String seriesDescription;

    @Column(length = 16)
    private String modality;

    @Column(name = "number_of_instances", nullable = false)
    private int numberOfInstances = 0;

    @Column(name = "thumbnail_url", length = 1024)
    private String thumbnailUrl;

    @Column(name = "series_number")
    private Integer seriesNumber;
}
