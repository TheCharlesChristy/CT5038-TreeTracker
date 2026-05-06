-- Setup Users and Auth
CREATE TABLE IF NOT EXISTS users (
    id bigint unsigned AUTO_INCREMENT PRIMARY KEY,
    username varchar(100) NOT NULL UNIQUE,
    email varchar(255),
    phone varchar(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP NULL DEFAULT NULL  -- NULL = unverified
) engine = InnoDB;

CREATE TABLE IF NOT EXISTS user_passwords (
    user_id bigint unsigned PRIMARY KEY,
    password_hash varchar(255) NOT NULL,
    CONSTRAINT fk_passwords_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) engine = InnoDB;

CREATE TABLE IF NOT EXISTS admins (
    user_id bigint unsigned PRIMARY KEY,
    CONSTRAINT fk_admins_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) engine = InnoDB;

CREATE TABLE IF NOT EXISTS user_sessions (
    id bigint unsigned AUTO_INCREMENT PRIMARY KEY,
    user_id bigint unsigned NOT NULL,
    session_token char(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) engine = InnoDB;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id bigint unsigned AUTO_INCREMENT PRIMARY KEY,
    user_id bigint unsigned NOT NULL,
    token char(64) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_verification_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) engine = InnoDB;

-- Core Tree Data
CREATE TABLE IF NOT EXISTS trees (
    id bigint unsigned AUTO_INCREMENT PRIMARY KEY,
    latitude decimal(9,6) NOT NULL,
    longitude decimal(9,6) NOT NULL,
    CONSTRAINT chk_trees_latitude CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT chk_trees_longitude CHECK (longitude BETWEEN -180 AND 180),
    INDEX idx_location (latitude,longitude)
) engine = InnoDB;

-- Tree creation data
CREATE TABLE IF NOT EXISTS tree_creation_data (
    id bigint unsigned AUTO_INCREMENT PRIMARY KEY,
    tree_id bigint unsigned NOT NULL,
    creator_user_id bigint unsigned,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_creation_tree FOREIGN KEY (tree_id)
    REFERENCES trees (id) ON DELETE CASCADE,
    CONSTRAINT fk_creation_user FOREIGN KEY (creator_user_id)
    REFERENCES users (id) ON DELETE SET NULL -- (updated to handle deleting users)
) engine = InnoDB;

-- Specific tree characteristics
CREATE TABLE IF NOT EXISTS tree_data (
    id bigint unsigned AUTO_INCREMENT PRIMARY KEY,
    tree_id bigint unsigned NOT NULL,
    UNIQUE INDEX uq_tree_data_tree_id (tree_id),
    tree_species varchar(255) NULL, -- Species name (test)
    avoided_runoff decimal(10,2) NULL, -- m^3
    carbon_dioxide_stored decimal(10,2) NULL, -- kg
    carbon_dioxide_removed decimal(10,2) NULL, -- kg
    water_intercepted decimal(10,2) NULL, -- m^3
    air_quality_improvement decimal(10,2) NULL, -- g/year
    leaf_area decimal(10,2) NULL, -- m^2
    evapotranspiration decimal(10,2) NULL, -- m^3
    trunk_circumference decimal(10,2) NULL, -- cm
    trunk_diameter decimal(10,2) NULL, -- cm
    tree_height decimal(10,2) NULL, -- m
    health enum('good','ok','bad') NULL, -- health rating (categorical)
    CONSTRAINT fk_data_tree FOREIGN KEY (tree_id)
    REFERENCES trees (id) ON DELETE CASCADE
) engine = InnoDB;

-- Relationship: Users watching over specific trees
CREATE TABLE IF NOT EXISTS guardian_trees (
    user_id bigint unsigned NOT NULL,
    tree_id bigint unsigned NOT NULL,
    PRIMARY KEY (user_id,tree_id),
    INDEX idx_guardian_trees_tree_id (tree_id),
    CONSTRAINT fk_guardian_trees_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_guardian_trees_tree FOREIGN KEY (tree_id)
    REFERENCES trees (id) ON DELETE CASCADE
) engine = InnoDB;

-- Media Storage
CREATE TABLE IF NOT EXISTS photos (
    id bigint unsigned AUTO_INCREMENT PRIMARY KEY,
    image_url text NOT NULL,
    mime_type varchar(100),
    byte_size int unsigned,
    sha256 char(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX uq_photo_sha256 (sha256)
) engine = InnoDB;

CREATE TABLE IF NOT EXISTS tree_photos (
    photo_id bigint unsigned NOT NULL,
    tree_id bigint unsigned NOT NULL,
    PRIMARY KEY (tree_id,photo_id),
    INDEX idx_treephotos_photo (photo_id),
    CONSTRAINT fk_treephotos_photo FOREIGN KEY (photo_id)
    REFERENCES photos (id) ON DELETE CASCADE,
    CONSTRAINT fk_treephotos_tree FOREIGN KEY (tree_id)
    REFERENCES trees (id) ON DELETE CASCADE
) engine = InnoDB;

-- Comments
CREATE TABLE IF NOT EXISTS comments (
    id bigint unsigned AUTO_INCREMENT PRIMARY KEY,
    user_id bigint unsigned,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE SET NULL
) engine = InnoDB;

-- Comment photos
CREATE TABLE IF NOT EXISTS comment_photos (
    comment_id bigint unsigned NOT NULL,
    photo_id bigint unsigned NOT NULL,
    PRIMARY KEY (comment_id,photo_id),
    CONSTRAINT fk_commentphotos_comment FOREIGN KEY (comment_id)
    REFERENCES comments (id) ON DELETE CASCADE,
    CONSTRAINT fk_commentphotos_photo FOREIGN KEY (photo_id)
    REFERENCES photos (id) ON DELETE CASCADE
) engine = InnoDB;

-- Comments on trees
CREATE TABLE IF NOT EXISTS comments_tree (
    comment_id bigint unsigned NOT NULL,
    tree_id bigint unsigned NOT NULL,
    content text NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (comment_id,tree_id),
    CONSTRAINT fk_comments_tree FOREIGN KEY (tree_id)
    REFERENCES trees (id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_comment FOREIGN KEY (comment_id)
    REFERENCES comments (id) ON DELETE CASCADE
) engine = InnoDB;

-- Comment replies (threaded comments)
CREATE TABLE IF NOT EXISTS comment_replies (
    comment_id bigint unsigned NOT NULL,
    parent_comment_id bigint unsigned NOT NULL,
    content text NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (comment_id,parent_comment_id),
    CONSTRAINT fk_replies_comment FOREIGN KEY (comment_id)
    REFERENCES comments (id) ON DELETE CASCADE,
    CONSTRAINT fk_replies_parent FOREIGN KEY (parent_comment_id)
    REFERENCES comments (id) ON DELETE CASCADE
) engine = InnoDB;

-- Observation Subtypes
CREATE TABLE IF NOT EXISTS wildlife_observations (
    comment_id bigint unsigned PRIMARY KEY,
    tree_id bigint unsigned NOT NULL,
    wildlife varchar(255) NOT NULL,
    wildlife_found tinyint(1) NOT NULL DEFAULT 0,
    observation_notes text,
    CONSTRAINT fk_wildlife_base FOREIGN KEY (comment_id)
    REFERENCES comments (id) ON DELETE CASCADE,
    CONSTRAINT fk_wildlife_tree FOREIGN KEY (tree_id)
    REFERENCES trees (id) ON DELETE CASCADE
) engine = InnoDB;

CREATE TABLE IF NOT EXISTS disease_observations (
    comment_id bigint unsigned PRIMARY KEY,
    tree_id bigint unsigned NOT NULL,
    disease varchar(255) NOT NULL,
    evidence text,
    CONSTRAINT fk_disease_base FOREIGN KEY (comment_id)
    REFERENCES comments (id) ON DELETE CASCADE,
    CONSTRAINT fk_disease_tree FOREIGN KEY (tree_id)
    REFERENCES trees (id) ON DELETE CASCADE
) engine = InnoDB;

CREATE TABLE IF NOT EXISTS seen_observations (
    comment_id bigint unsigned PRIMARY KEY,
    tree_id bigint unsigned NOT NULL,
    observation_notes text,
    CONSTRAINT fk_seen_base FOREIGN KEY (comment_id)
    REFERENCES comments (id) ON DELETE CASCADE,
    CONSTRAINT fk_seen_tree FOREIGN KEY (tree_id)
    REFERENCES trees (id) ON DELETE CASCADE
) engine = InnoDB;

CREATE TABLE IF NOT EXISTS guardians (
    user_id bigint unsigned PRIMARY KEY,
    CONSTRAINT fk_guardians_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) engine = InnoDB;

CREATE INDEX idx_comments_tree_created_at ON comments_tree (created_at,comment_id,tree_id);

CREATE INDEX idx_verification_tokens_user ON email_verification_tokens (user_id);

CREATE INDEX idx_verification_tokens_expires ON email_verification_tokens (expires_at);

CREATE INDEX idx_users_verified_at ON users (verified_at);
