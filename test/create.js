const {
  DynamoDBClient,
  BatchWriteItemCommand,
} = require("@aws-sdk/client-dynamodb");

// creates 25 items for testing.

function buildRequest() {
  const RequestItems = {
    stuff: [],
  };

  for (let i = 0; i < 25; i++) {
    const put = {
      PutRequest: {
        Item: {
          id: {
            S: i + "abcd" + Math.random().toString().substr(4, 4),
          },
          created: {
            N: (new Date().getTime() + i).toString(),
          },
        },
      },
    };
    if (i % 6 === 0) {
      put.PutRequest.Item.test = {
        N: "1",
      };
    }
    RequestItems.stuff.push(put);
  }
  return RequestItems;
}

async function main() {
  const client = new DynamoDBClient({ region: "us-east-1" });
  const command = new BatchWriteItemCommand({
    RequestItems: buildRequest(),
  });
  try {
    const results = await client.send(command);
    console.log(results);
  } catch (err) {
    console.error(err);
  }
}

main();
