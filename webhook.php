<?php
/**
 * GitHub Webhook Handler for nuvi-dashboard
 *
 * This script receives webhook notifications from GitHub when code is pushed
 * and automatically pulls the latest changes.
 */

// Configuration
$SECRET = '11ef3c2afba09858ff4b159d4947d29700d13753eb27463ec12747414837338d'; // CHANGE THIS to a random string
$REPO_PATH = '/home/apps/nuvi-dashboard'; // Path to your repo on the server
$BRANCH = 'main';
$LOG_FILE = $REPO_PATH . '/webhook.log';

// Function to log messages
function logMessage($message) {
    global $LOG_FILE;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($LOG_FILE, "[$timestamp] $message\n", FILE_APPEND);
}

// Get the webhook payload
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';

// Verify the signature
if (!empty($SECRET)) {
    $expected_signature = 'sha256=' . hash_hmac('sha256', $payload, $SECRET);

    if (!hash_equals($expected_signature, $signature)) {
        logMessage('ERROR: Invalid signature. Webhook rejected.');
        http_response_code(403);
        die('Invalid signature');
    }
}

// Decode the payload
$data = json_decode($payload, true);

// Check if this is a push event to the correct branch
if (!isset($data['ref']) || $data['ref'] !== "refs/heads/$BRANCH") {
    logMessage('INFO: Not a push to ' . $BRANCH . ' branch, ignoring.');
    http_response_code(200);
    die('Not the target branch');
}

logMessage('INFO: Received valid webhook for push to ' . $BRANCH);

// Change to repo directory and pull latest changes
chdir($REPO_PATH);

// Run git pull
$output = [];
$return_var = 0;

exec('git pull origin ' . escapeshellarg($BRANCH) . ' 2>&1', $output, $return_var);

$output_string = implode("\n", $output);

if ($return_var === 0) {
    logMessage("SUCCESS: Git pull completed.\n" . $output_string);
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'Deployment successful',
        'output' => $output_string
    ]);
} else {
    logMessage("ERROR: Git pull failed.\n" . $output_string);
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Deployment failed',
        'output' => $output_string
    ]);
}
