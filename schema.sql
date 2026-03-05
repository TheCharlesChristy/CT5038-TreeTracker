/*
 * Tree Tracking System Schema (MySQL / MariaDB)
 * ---------------------------------------------
 * NOTE: This schema targets MySQL-compatible databases only and uses
 * MySQL-specific features (e.g., UNSIGNED, AUTO_INCREMENT, ENGINE).
 * It will not run as-is on PostgreSQL or SQLite.
 *
 * To apply this schema on MySQL, for example:
 * mysql -u <user> -p<password> <database> < DATABASE_SCHEMA.sql
 *
 * For other databases, use an engine-specific schema or migrations.
 * Note: Images are stored as URLs/Paths to keep the DB lightweight.
 * Lat/Lon uses DECIMAL(9, 6) for ~10cm precision.
 */

-- Setup Users and Auth
CREATE TABLE users (
    id bigint unsigned AUTO_INCREMENT PRIMARY KEY,
    username varchar(100) NOT NULL UNIQUE,
    email varchar(255),
    phone varchar(50)
) engine = InnoDB;

CREATE TABLE user_passwords (
    user_id bigint unsigned PRIMARY KEY,
    password_hash varchar(255) NOT NULL,
    CONSTRAINT fk_passwords_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) engine = InnoDB;

CREATE TABLE admins (
    user_id bigint unsigned PRIMARY KEY,
    CONSTRAINT fk_admins_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) engine = InnoDB;

CREATE TABLE user_sessions (
    id bigint unsigned AUTO_INCREMENT PRIMARY KEY,
    user_id bigint unsigned NOT NULL,
    session_token char(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) engine = InnoDB;

-- Core Tree Data
CREATE TABLE trees (
    id bigint unsigned AUTO_INCREMENT PRIMARY KEY,
    latitude decimal(9,6) NOT NULL,
    longitude decimal(9,6) NOT NULL,
    CONSTRAINT chk_trees_latitude CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT chk_trees_longitude CHECK (longitude BETWEEN -180 AND 180),
    INDEX idx_location (latitude,longitude)
) engine = InnoDB;

-- Tree creation data
CREATE TABLE tree_creation_data (
    id bigint unsigned AUTO_INCREMENT PRIMARY KEY,
    tree_id bigint unsigned NOT NULL,
    creator_user_id bigint unsigned,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_creation_tree FOREIGN KEY (tree_id)
    REFERENCES trees (id) ON DELETE CASCADE,
    CONSTRAINT fk_creation_user FOREIGN KEY (creator_user_id)
    REFERENCES users (id) ON DELETE RESTRICT
) engine = InnoDB;

-- Specific tree characteristics
CREATE TABLE tree_data (
    id bigint unsigned AUTO_INCREMENT PRIMARY KEY,
    tree_id bigint unsigned NOT NULL,
    avoided_runoff decimal(10,2) NULL, -- in m^3
    carbon_dioxide_stored decimal(10,2) NULL, -- in kg
    carbon_dioxide_removed decimal(10,2) NULL, -- in kg
    water_intercepted decimal(10,2) NULL, -- in m^3
    air_quality_improvement decimal(10,2) NULL, -- in g/year
    leaf_area decimal(10,2) NULL, -- in m^2
    evapotranspiration decimal(10,2) NULL, -- in m^3
    trunk_circumference decimal(10,2) NULL, -- in cm
    trunk_diameter decimal(10,2) NULL, -- in cm
    tree_height decimal(10,2) NULL, -- in m
    CONSTRAINT fk_data_tree FOREIGN KEY (tree_id)
    REFERENCES trees (id) ON DELETE CASCADE
) engine = InnoDB;

-- Relationship: Users watching over specific trees
CREATE TABLE guardians (
    user_id bigint unsigned NOT NULL,
    tree_id bigint unsigned NOT NULL,
    PRIMARY KEY (user_id,tree_id),
    INDEX idx_guardians_tree_id (tree_id),
    CONSTRAINT fk_guardians_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_guardians_tree FOREIGN KEY (tree_id)
    REFERENCES trees (id) ON DELETE CASCADE
) engine = InnoDB;

-- Media Storage
CREATE TABLE photos (
    id bigint unsigned AUTO_INCREMENT PRIMARY KEY,
    image_url text NOT NULL,
    mime_type varchar(100),
    byte_size int unsigned,
    sha256 char(64),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX uq_photo_sha256 (sha256)
) engine = InnoDB;

CREATE TABLE tree_photos (
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
CREATE TABLE comments (
    id bigint unsigned AUTO_INCREMENT PRIMARY KEY,
    user_id bigint unsigned,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE SET NULL
) engine = InnoDB;

-- Comment photos
CREATE TABLE comment_photos (
    comment_id bigint unsigned NOT NULL,
    photo_id bigint unsigned NOT NULL,
    PRIMARY KEY (comment_id,photo_id),
    CONSTRAINT fk_commentphotos_comment FOREIGN KEY (comment_id)
    REFERENCES comments (id) ON DELETE CASCADE,
    CONSTRAINT fk_commentphotos_photo FOREIGN KEY (photo_id)
    REFERENCES photos (id) ON DELETE CASCADE
) engine = InnoDB;

-- Comments on trees
CREATE TABLE comments_tree (
    comment_id bigint unsigned NOT NULL,
    tree_id bigint unsigned NOT NULL,
    content text NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (comment_id,tree_id),
    CONSTRAINT fk_comments_tree FOREIGN KEY (tree_id)
    REFERENCES trees (id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_comment FOREIGN KEY (comment_id)
    REFERENCES comments (id) ON DELETE CASCADE
) engine = InnoDB;

-- Comment replies (threaded comments)
CREATE TABLE comment_replies (
    comment_id bigint unsigned NOT NULL,
    parent_comment_id bigint unsigned NOT NULL,
    content text NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (comment_id,parent_comment_id),
    CONSTRAINT fk_replies_comment FOREIGN KEY (comment_id)
    REFERENCES comments (id) ON DELETE CASCADE,
    CONSTRAINT fk_replies_parent FOREIGN KEY (parent_comment_id)
    REFERENCES comments (id) ON DELETE CASCADE
) engine = InnoDB;

-- Observation Subtypes
CREATE TABLE wildlife_observations (
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

CREATE TABLE disease_observations (
    comment_id bigint unsigned PRIMARY KEY,
    tree_id bigint unsigned NOT NULL,
    disease varchar(255) NOT NULL,
    evidence text,
    CONSTRAINT fk_disease_base FOREIGN KEY (comment_id)
    REFERENCES comments (id) ON DELETE CASCADE,
    CONSTRAINT fk_disease_tree FOREIGN KEY (tree_id)
    REFERENCES trees (id) ON DELETE CASCADE
) engine = InnoDB;

CREATE TABLE seen_observations (
    comment_id bigint unsigned PRIMARY KEY,
    tree_id bigint unsigned NOT NULL,
    observation_notes text,
    CONSTRAINT fk_seen_base FOREIGN KEY (comment_id)
    REFERENCES comments (id) ON DELETE CASCADE,
    CONSTRAINT fk_seen_tree FOREIGN KEY (tree_id)
    REFERENCES trees (id) ON DELETE CASCADE
) engine = InnoDB;
