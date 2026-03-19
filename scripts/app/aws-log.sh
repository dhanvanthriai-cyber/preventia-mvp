API_SERVICE_ID=$(aws apprunner list-services --region ap-south-1 --query "ServiceSummaryList[?ServiceName=='preventia-api'].ServiceId" --output text)
echo "$API_SERVICE_ID"

aws logs describe-log-groups \
  --log-group-name-prefix "/aws/apprunner/preventia-api/${API_SERVICE_ID}/" \
  --region ap-south-1

SERVICE_STREAM=$(aws logs describe-log-streams \
  --log-group-name "/aws/apprunner/preventia-api/${API_SERVICE_ID}/service" \
  --region ap-south-1 \
  --order-by LastEventTime \
  --descending \
  --query 'logStreams[0].logStreamName' \
  --output text)

APP_STREAM=$(aws logs describe-log-streams \
  --log-group-name "/aws/apprunner/preventia-api/${API_SERVICE_ID}/application" \
  --region ap-south-1 \
  --order-by LastEventTime \
  --descending \
  --query 'logStreams[0].logStreamName' \
  --output text)

aws logs get-log-events \
  --log-group-name "/aws/apprunner/preventia-api/${API_SERVICE_ID}/service" \
  --log-stream-name "$SERVICE_STREAM" \
  --limit 80 \
  --region ap-south-1

aws logs get-log-events \
  --log-group-name "/aws/apprunner/preventia-api/${API_SERVICE_ID}/application" \
  --log-stream-name "$APP_STREAM" \
  --limit 120 \
  --region ap-south-1
