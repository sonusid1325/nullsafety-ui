export type CertificateVerification = {
  "version": "0.1.0",
  "name": "certificate_verification",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "globalState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "registerInstitution",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "institution",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "globalState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "location",
          "type": "string"
        }
      ]
    },
    {
      "name": "issueCertificate",
      "accounts": [
        {
          "name": "issuer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "institution",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "certificate",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "globalState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "studentName",
          "type": "string"
        },
        {
          "name": "courseName",
          "type": "string"
        },
        {
          "name": "grade",
          "type": "string"
        },
        {
          "name": "certificateId",
          "type": "string"
        }
      ]
    },
    {
      "name": "verifyCertificate",
      "accounts": [
        {
          "name": "verifier",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "certificate",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "globalState",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "revokeCertificate",
      "accounts": [
        {
          "name": "revoker",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "certificate",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "institution",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "verifyInstitution",
      "accounts": [
        {
          "name": "globalState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "institution",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "globalState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "totalInstitutions",
            "type": "u64"
          },
          {
            "name": "totalCertificates",
            "type": "u64"
          },
          {
            "name": "totalVerifications",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "institution",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "location",
            "type": "string"
          },
          {
            "name": "isVerified",
            "type": "bool"
          },
          {
            "name": "certificatesIssued",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "certificate",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "institution",
            "type": "publicKey"
          },
          {
            "name": "studentName",
            "type": "string"
          },
          {
            "name": "courseName",
            "type": "string"
          },
          {
            "name": "grade",
            "type": "string"
          },
          {
            "name": "certificateId",
            "type": "string"
          },
          {
            "name": "isRevoked",
            "type": "bool"
          },
          {
            "name": "verificationCount",
            "type": "u64"
          },
          {
            "name": "issuedAt",
            "type": "i64"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "SystemInitialized",
      "fields": [
        {
          "name": "authority",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "InstitutionRegistered",
      "fields": [
        {
          "name": "institution",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "name",
          "type": "string",
          "index": false
        },
        {
          "name": "location",
          "type": "string",
          "index": false
        },
        {
          "name": "authority",
          "type": "publicKey",
          "index": false
        }
      ]
    },
    {
      "name": "CertificateIssued",
      "fields": [
        {
          "name": "certificate",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "institution",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "studentName",
          "type": "string",
          "index": false
        },
        {
          "name": "courseName",
          "type": "string",
          "index": false
        },
        {
          "name": "certificateId",
          "type": "string",
          "index": false
        }
      ]
    },
    {
      "name": "CertificateVerified",
      "fields": [
        {
          "name": "certificate",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "verifier",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "count",
          "type": "u64",
          "index": false
        }
      ]
    },
    {
      "name": "CertificateRevoked",
      "fields": [
        {
          "name": "certificate",
          "type": "publicKey",
          "index": false
        }
      ]
    },
    {
      "name": "InstitutionVerified",
      "fields": [
        {
          "name": "institution",
          "type": "publicKey",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "CertificateRevoked",
      "msg": "Certificate has been revoked"
    }
  ]
};

export const IDL: CertificateVerification = {
  "version": "0.1.0",
  "name": "certificate_verification",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "globalState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "registerInstitution",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "institution",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "globalState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "location",
          "type": "string"
        }
      ]
    },
    {
      "name": "issueCertificate",
      "accounts": [
        {
          "name": "issuer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "institution",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "certificate",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "globalState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "studentName",
          "type": "string"
        },
        {
          "name": "courseName",
          "type": "string"
        },
        {
          "name": "grade",
          "type": "string"
        },
        {
          "name": "certificateId",
          "type": "string"
        }
      ]
    },
    {
      "name": "verifyCertificate",
      "accounts": [
        {
          "name": "verifier",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "certificate",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "globalState",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "revokeCertificate",
      "accounts": [
        {
          "name": "revoker",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "certificate",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "institution",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "verifyInstitution",
      "accounts": [
        {
          "name": "globalState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "institution",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "globalState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "totalInstitutions",
            "type": "u64"
          },
          {
            "name": "totalCertificates",
            "type": "u64"
          },
          {
            "name": "totalVerifications",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "institution",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "location",
            "type": "string"
          },
          {
            "name": "isVerified",
            "type": "bool"
          },
          {
            "name": "certificatesIssued",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "certificate",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "institution",
            "type": "publicKey"
          },
          {
            "name": "studentName",
            "type": "string"
          },
          {
            "name": "courseName",
            "type": "string"
          },
          {
            "name": "grade",
            "type": "string"
          },
          {
            "name": "certificateId",
            "type": "string"
          },
          {
            "name": "isRevoked",
            "type": "bool"
          },
          {
            "name": "verificationCount",
            "type": "u64"
          },
          {
            "name": "issuedAt",
            "type": "i64"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "SystemInitialized",
      "fields": [
        {
          "name": "authority",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "InstitutionRegistered",
      "fields": [
        {
          "name": "institution",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "name",
          "type": "string",
          "index": false
        },
        {
          "name": "location",
          "type": "string",
          "index": false
        },
        {
          "name": "authority",
          "type": "publicKey",
          "index": false
        }
      ]
    },
    {
      "name": "CertificateIssued",
      "fields": [
        {
          "name": "certificate",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "institution",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "studentName",
          "type": "string",
          "index": false
        },
        {
          "name": "courseName",
          "type": "string",
          "index": false
        },
        {
          "name": "certificateId",
          "type": "string",
          "index": false
        }
      ]
    },
    {
      "name": "CertificateVerified",
      "fields": [
        {
          "name": "certificate",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "verifier",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "count",
          "type": "u64",
          "index": false
        }
      ]
    },
    {
      "name": "CertificateRevoked",
      "fields": [
        {
          "name": "certificate",
          "type": "publicKey",
          "index": false
        }
      ]
    },
    {
      "name": "InstitutionVerified",
      "fields": [
        {
          "name": "institution",
          "type": "publicKey",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "CertificateRevoked",
      "msg": "Certificate has been revoked"
    }
  ]
};
