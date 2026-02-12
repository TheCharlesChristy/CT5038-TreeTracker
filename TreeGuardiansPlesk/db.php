<?php
$pdo = new PDO(
  "mysql:host=localhost;dbname=TG_DB;charset=utf8mb4",
  "Guardian",
  "SecretGuardian0",
  [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
  ]
);