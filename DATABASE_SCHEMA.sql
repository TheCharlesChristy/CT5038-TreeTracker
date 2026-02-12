/*
 * Tree Tracking System Schema (MySQL / MariaDB)
 * --------------------------
 * NOTE: This schema targets MySQL-compatible databases only and uses
 *       MySQL-specific features (e.g., UNSIGNED, AUTO_INCREMENT, ENGINE).
 *       It will not run as-is on PostgreSQL or SQLite.
 *
 *       To apply this schema on MySQL, for example:
 *           mysql -u <user> -p<password> <database> < DATABASE_SCHEMA.sql
 *
 *       For other databases, use an engine-specific schema or migrations.
 * Note: Images are stored as URLs/Paths to keep the DB lightweight.
 * Lat/Lon uses DECIMAL(9,6) for ~10cm precision.
 */

-- Setup Users and Auth
create table users (
    id bigint unsigned auto_increment primary key,
    username varchar(100) not null unique,
    email varchar(255),
    phone varchar(50)
) engine=InnoDB;

create table user_passwords (
    user_id bigint unsigned primary key,
    password_hash varchar(255) not null,
    constraint fk_passwords_user foreign key (user_id) 
        references users(id) on delete cascade
) engine=InnoDB;

create table admins (
    user_id bigint unsigned primary key,
    constraint fk_admins_user foreign key (user_id) references users(id) on delete cascade
) engine=InnoDB;

create table user_sessions (
    id bigint unsigned auto_increment primary key,
    user_id bigint unsigned not null, 
    session_token char(64) not null unique, 
    expires_at datetime not null, 
    constraint fk_sessions_user foreign key (user_id) references users(id) on delete cascade 
) engine=InnoDB;

-- Core Tree Data
create table trees (
    id bigint unsigned auto_increment primary key,
    latitude decimal(9,6) not null,
    longitude decimal(9,6) not null,
    constraint chk_trees_latitude check (latitude between -90 and 90),
    constraint chk_trees_longitude check (longitude between -180 and 180),
    index idx_location (latitude, longitude)
) engine=InnoDB;

-- Flexible JSON storage for specific tree characteristics
create table tree_data (
    id bigint unsigned auto_increment primary key,
    tree_id bigint unsigned not null,
    data json not null,
    created_at datetime default current_timestamp,
    constraint fk_data_tree foreign key (tree_id) 
        references trees(id) on delete cascade
) engine=InnoDB;

-- Relationship: Users watching over specific trees
create table guardians (
    user_id bigint unsigned not null,
    tree_id bigint unsigned not null,
    primary key (user_id, tree_id),
    constraint fk_guardians_user foreign key (user_id) references users(id) on delete cascade,
    constraint fk_guardians_tree foreign key (tree_id) references trees(id) on delete cascade
) engine=InnoDB;

-- Media Storage
create table photos (
    id bigint unsigned auto_increment primary key,
    image_url text not null,
    mime_type varchar(100),
    byte_size int unsigned,
    sha256 char(64),
    created_at datetime default current_timestamp,
    unique index uq_photo_sha256 (sha256)
) engine=InnoDB;

create table tree_photos (
    photo_id bigint unsigned not null,
    tree_id bigint unsigned not null,
    primary key (photo_id, tree_id),
    constraint fk_treephotos_photo foreign key (photo_id) references photos(id) on delete cascade,
    constraint fk_treephotos_tree foreign key (tree_id) references trees(id) on delete cascade
) engine=InnoDB;

-- Logging / Observations
create table observations (
    id bigint unsigned auto_increment primary key,
    user_id bigint unsigned not null,
    created_at datetime default current_timestamp,
    constraint fk_obs_user foreign key (user_id) references users(id) on delete cascade
) engine=InnoDB;

-- Observation Subtypes
create table wildlife_observations (
    observation_id bigint unsigned primary key,
    tree_id bigint unsigned not null,
    wildlife varchar(255) not null,
    wildlife_found tinyint(1) not null default 0,
    comment text,
    photo_id bigint unsigned,
    constraint fk_wildlife_base foreign key (observation_id) references observations(id) on delete cascade,
    constraint fk_wildlife_tree foreign key (tree_id) references trees(id) on delete cascade,
    constraint fk_wildlife_photo foreign key (photo_id) references photos(id) on delete set null
) engine=InnoDB;

create table disease_observations (
    observation_id bigint unsigned primary key,
    tree_id bigint unsigned not null,
    disease varchar(255) not null,
    evidence text,
    photo_id bigint unsigned,
    constraint fk_disease_base foreign key (observation_id) references observations(id) on delete cascade,
    constraint fk_disease_tree foreign key (tree_id) references trees(id) on delete cascade,
    constraint fk_disease_photo foreign key (photo_id) references photos(id) on delete set null
) engine=InnoDB;

create table seen_observations (
    observation_id bigint unsigned primary key,
    tree_id bigint unsigned not null,
    comment text,
    constraint fk_seen_base foreign key (observation_id) references observations(id) on delete cascade,
    constraint fk_seen_tree foreign key (tree_id) references trees(id) on delete cascade
) engine=InnoDB;