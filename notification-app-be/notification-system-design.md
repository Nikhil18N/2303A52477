# Notification System Design
# Stage 1

## Core Actions

1. Fetch Notifications
2. Fetch Unread Notifications
3. Mark Notification as Read
4. Mark All Notifications as Read
5. Create Notification
6. Delete Notification
7. Real-Time Notification Delivery

---

## 1. Get All Notifications

### Request

```http
GET /api/v1/notifications
Authorization: Bearer <token>
```

### Response

```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "Placement",
      "message": "Amazon Interview Round",
      "isRead": false,
      "createdAt": "2026-06-18T10:00:00Z"
    }
  ]
}
```

---

## 2. Get Unread Notifications

### Request

```http
GET /api/v1/notifications/unread
Authorization: Bearer <token>
```

### Response

```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "Result",
      "message": "Mid-sem Results Published",
      "isRead": false
    }
  ]
}
```

---

## 3. Mark Notification Read

### Request

```http
PATCH /api/v1/notifications/{notificationId}/read
Authorization: Bearer <token>
```

### Response

```json
{
  "success": true
}
```

---

## 4. Mark All Notifications Read

### Request

```http
PATCH /api/v1/notifications/read-all
Authorization: Bearer <token>
```

### Response

```json
{
  "success": true
}
```

---

## 5. Create Notification

### Request

```http
POST /api/v1/notifications
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "type": "Placement",
  "message": "Microsoft Hiring Drive"
}
```

### Response

```json
{
  "id": "uuid",
  "success": true
}
```

---

## Real-Time Notifications

Use WebSockets.

### Client Connection

```http
GET /ws/notifications
```

Server pushes:

```json
{
  "id": "uuid",
  "type": "Placement",
  "message": "New Placement Opportunity",
  "createdAt": "2026-06-18T10:00:00Z"
}
```

---

# Stage 2

## Database Choice

PostgreSQL

Reasons:

* Strong ACID guarantees
* Efficient indexing
* Reliable transactions
* Mature ecosystem
* Suitable for notification workloads

---

## Schema

### students

```sql
CREATE TABLE students (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(255) UNIQUE
);
```

### notifications

```sql
CREATE TYPE notification_type AS ENUM
(
    'Event',
    'Result',
    'Placement'
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    student_id BIGINT REFERENCES students(id),
    notification_type notification_type,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
);
```

---

## Scaling Challenges

At millions of notifications:

* Slow queries
* Large indexes
* Increased storage
* Expensive sorting

### Solutions

* Indexes
* Table partitioning by date
* Read replicas
* Redis cache
* Archiving old notifications

---

## Example Queries

Unread notifications:

```sql
SELECT *
FROM notifications
WHERE student_id = ?
AND is_read = FALSE
ORDER BY created_at DESC;
```

Mark read:

```sql
UPDATE notifications
SET is_read = TRUE
WHERE id = ?;
```

---

# Stage 3

Query:

```sql
SELECT *
FROM notifications
WHERE studentID = 1042
AND isRead = false
ORDER BY createdAt DESC;
```

## Is it accurate?

Yes.

It returns unread notifications ordered by newest first.

## Why slow?

With 5 million rows:

* Full table scans
* Expensive sorting
* No selective indexes

## Better Index

```sql
CREATE INDEX idx_notifications_student_read_created
ON notifications
(student_id,is_read,created_at DESC);
```

Expected complexity:

Before:

```text
O(N)
```

After:

```text
O(log N)
```

## Should we index every column?

No.

Problems:

* Larger storage
* Slower inserts
* Slower updates
* Maintenance overhead

Only index columns used frequently in filtering, joins, and sorting.

## Placement Notifications in Last 7 Days

```sql
SELECT *
FROM notifications
WHERE notification_type='Placement'
AND created_at >= NOW() - INTERVAL '7 days';
```

---

# Stage 4

Problem:

Every page load hits DB.

## Solutions

### Redis Cache

Pros:

* Fast
* Reduces DB load

Cons:

* Cache invalidation complexity

### Pagination

Pros:

* Less data transferred

Cons:

* More API calls

### Infinite Scroll

Pros:

* Better UX

Cons:

* More frontend complexity

### Read Replicas

Pros:

* Scales reads

Cons:

* Replication lag

Recommended:

Redis + Pagination + Read Replicas

---

# Stage 5

Problems in Existing Code

* Sequential processing
* Slow
* Email failures leave inconsistent state
* No retry mechanism
* No fault tolerance

## Better Architecture

Use Message Queue (RabbitMQ/Kafka).

### Revised Pseudocode

```python
function notify_all(student_ids, message):

    notification_id = create_notification_batch(message)

    for student_id in student_ids:

        queue.publish({
            student_id,
            notification_id,
            message
        })
```

Worker:

```python
while true:

    job = queue.consume()

    save_to_db(job)

    send_email(job)

    push_to_app(job)

    mark_completed(job)
```

### Why?

* Reliable
* Retry support
* Parallel processing
* Faster throughput

DB save and email should not be tightly coupled.

Email can fail and be retried independently.

---

# Stage 6

## Priority Logic

Weights:

```text
Placement = 3
Result = 2
Event = 1
```

Priority Score:

```text
score = weight * 1000 + recency_score
```

## Efficient Top 10

Maintain a Min Heap of size 10.

Complexity:

```text
O(N log 10)
```

which is effectively:

```text
O(N)
```

for incoming notifications.

New notifications are compared against the heap root and inserted only if they have higher priority.
