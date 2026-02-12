<?php
header('Content-Type: application/json');

// Read JSON body
$data = json_decode(file_get_contents("php://input"), true);

$username = $data['username'] ?? null;
$password = $data['password'] ?? null;

if (!$username || !$password) {
    echo json_encode([
        'success' => false,
        'message' => 'Missing fields'
    ]);
    exit;
}

// DB connection
$conn = new mysqli("localhost", "Guardian", "SecretGuardian0", "TG_DB");

if ($conn->connect_error) {
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed'
    ]);
    exit;
}

// Hash password
$hash = password_hash($password, PASSWORD_DEFAULT);

// Insert user
$stmt = $conn->prepare(
    "INSERT INTO users (username, password, role) VALUES (?, ?, 'user')"
);
$stmt->bind_param("ss", $username, $hash);

if ($stmt->execute()) {
    echo json_encode([
        'success' => true,
        'role' => 'user'
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Username already exists'
    ]);
}

$stmt->close();
$conn->close();