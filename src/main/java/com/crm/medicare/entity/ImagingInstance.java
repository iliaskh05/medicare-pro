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
@Table(name = "imaging_instances")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ImagingInstance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "series_id", nullable = false)
    private ImagingSeries series;

    @Column(name = "sop_instance_uid", length = 128)
    private String sopInstanceUid;

    @Column(name = "instance_number")
    private Integer instanceNumber;

    @Column(name = "wado_uri", length = 1024)
    private String wadoUri;
}
