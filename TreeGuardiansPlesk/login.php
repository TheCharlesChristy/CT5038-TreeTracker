<?php
header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

$username = $data['username'] ?? null;
$password = $data['password'] ?? null;

if (!$username || !$password) {
    echo json_encode(['success' => false]);
    exit;
}

$conn = new mysqli("localhost", "Guardian", "SecretGuardian0", "TG_DB");

$stmt = $conn->prepare(
    "SELECT password, role FROM users WHERE username = ?"
);
$stmt->bind_param("s", $username);
$stmt->execute();

$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(['success' => false]);
    exit;
}

$user = $result->fetch_assoc();

if (password_verify($password, $user['password'])) {
    echo json_encode([
        'success' => true,
        'role' => $user['role']
    ]);
} else {
    echo json_encode(['success' => false]);
}