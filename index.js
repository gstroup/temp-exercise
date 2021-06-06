const {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand,
} = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient({ region: "us-east-1" });

/**
Scan to find all the items where "test" is missing.
	Use a filter expression.
	use LastEvaluatedKey as the ExclusiveStartKey for the next iteration. (use Limit to test this)
	iterate over each item and call updateItem, with a ConditionExpression
		https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html#API_UpdateItem_RequestSyntax
		https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#updateItem-property
**/

async function addTestField(item) {
  console.log("updating item: ", item);
  const command = new UpdateItemCommand({
    TableName: "stuff",
    UpdateExpression: "SET test = :testVal",
    Key: {
      id: {
        S: item.id.S,
      },
      created: {
        N: item.created.N,
      },
    },
    ExpressionAttributeValues: {
      ":testVal": { N: "1" },
    },
  });
  try {
    const result = await client.send(command);
    // console.log("updated an item.", result);
  } catch (err) {
    console.error(err);
  }
}

async function main() {
  let lastKey = "START";
  while (lastKey) {
    const command = new ScanCommand({
      TableName: "stuff",
      FilterExpression: "attribute_not_exists(test)",
      // Set limit just for testing.  Remove this when running in production.
      Limit: 10,
      ExclusiveStartKey: lastKey === "START" ? null : lastKey,
    });

    try {
      // console.log("sending command: ", command);
      const results = await client.send(command);
      // console.log(results);
      console.log("found %s items to update", results.Count);
      // If we want to run multiple instances of this script, we might want to write the lastKey to a file.
      lastKey = results.LastEvaluatedKey;
      results.Items.forEach((item) => {
        addTestField(item);
      });
    } catch (err) {
      console.error(err);
    }
  }
  console.log("Update is complete.");
}

main();
