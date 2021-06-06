## Problem statement

We have a live, production, DynamoDB table with roughly 5 million records. The table name is “stuff”.

Each record has at least the following fields:

“id” - A GUID for this record and it is the partition key
“created” – A timestamp for when the record was first created and it is the sort key
 
The latest version of code will automatically set the “test” field when creating a record, however existing records may not have this field. The latest version of the code is ready to deploy.

As part of a migration (once off), we want to add a field to every record in the table. That field is called “test” and it should be set to 1 for any existing records that don’t already have the value set.

#### Describe:

How you intend to perform the task. Be detailed, assume that someone else is going to actually execute your plan and will do “the wrong thing” if you don’t tell them otherwise.
How you can be certain that all records have been updated?
What else you should be careful about and how you would address those concerns?
If a developer/team made this request (and it wasn’t an interview question) for a service you’re jointly responsible for, is there anything you’d do differently?
 
Please provide relevant and complete code for the approach you have proposed.

Also, provide a CloudFormation script that would create this DynamoDB table. 

---

## Solution

This is actually a rather difficult problem, since Dynamo DB is not designed for batch updates.
In a real life scenario, I think the best solution would be to write the application code so it could handle items without the "test" field, as well as items with the "test" field.  This would be a simple fix in just a line or two of code, and no migration would be needed.  For this exercise, I assumed the application code will break if the "test" field is missing.  I wrote the script for the solution in JavaScript, since that's a simple scripting language I'm familiar with.  This solution is a "brute force" approach that will update each database item one at a time.  This could take a long time with 5 million rows, however multiple instances of this script could be run at the same time to speed it up.

#### CloudFormation script
Running this command will create the simple table described in the problem statement:
```
aws cloudformation create-stack --stack-name dolby-db --template-body file://dolby-template.json
```

* AWS access key must have permission for AWSCloudFormation:CreateStack
* id is a string, so it can contain an alphanumeric guid.
* created is a number, so it can contain a numeric timestamp and sort properly.

#### Test data
First, make sure you have NodeJS installed, then run "yarn install" (or "npm install") to install the dependencies for this solution.  The only dependency is the AWS SDK for javascript.  You'll also need an AWS Access Key with permissions to update the Dynamo DB.

Now you can insert 25 rows of test data into the "stuff" table by running this command:
```
node test/create.js
```

#### Updating the database
Now we can run the migration script with this command:
```
node index.js
```
This script will scan the database for items that are missing the "test" field.  Then it iterates over each one, and calls the "UpdateItem" API to add the test field with value = 1.  Notice on line 50 of index.js, there is an artifical limit placed on the result set size, just to test pagination.  This should be removed when running in a real scenario.

Below are some notes and considerations for running this migration script.


What else you should be careful about and how you would address those concerns?
If a developer/team made this request (and it wasn’t an interview question) for a service you’re jointly responsible for, is there anything you’d do differently?

---
- DynamoDB is not great for bulk operations.  Bulk write operations can only update 25 items at a time.  There is no API to update multiple items at once.
- AWS quotas: 40,000 read request units  (per second?) This could become an issue if running the script on a large database.
- BatchWriteItem API - I learned that this API cannot update items. 
- Also can't use the TransactionWriteItems API, since you can't use ConditionCheck and Update on the same item.
- Multi-threading - this could be the next step to improve performance of the migration script.  Since JS is single-threaded, we could simply run multiple instances of this script, maybe as Lambda functions.
  - If we are running multiple instances of the script, we'd probably want to write the "LastEvaluatedKey" to a shared file.
- Network latency - This would definitely become an issue with a large DB.  The script should be run on an EC2 instance, probably with a VPC endpoint pointing to Dynamo DB, to ensure the traffic stays inside AWS.
- Writing to a log file - we could log important data to a log file easily.  Might be good to log errors.  However, this script is written so that it can be re-run as many times as necessary until all records are updated, so I dind't think logging was so important.
- Re-running after error or interruption - This script will only update items that are missing the "test" field.  So it can be run repeatedly.
- Assumption:  Users are also updating the "test" field at the same time.
- Data consistency - how important is it? if it's important, we may need downtime.  With this solution, it's possible that a user could update the "test" field, and set it to a value of 2, then this script could set it to a value of 1.
- Script uses AWS native pagination to break the data into 1 MB chunks.  https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Pagination.html
- We should run the script repeatedly, until we see the output showing only "found 0 items to update".  Then we know that all rows have been updated.






