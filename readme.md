# Library Management System

This system manages book borrowing by keeping an organized waiting list for every book. If a member requests a book that has no available copies, they are added to that book’s waiting list, and the system automatically highlights the top three active candidates who should be notified about future availability.

When a copy is returned, the system updates the queue, promotes the next eligible members, and refreshes the notifications accordingly. If a book has zero available copies, the system automatically clears all notifications for that book to avoid showing candidates when borrowing isn’t possible.

Overall, the algorithm provides a fair, efficient, and dynamic way to manage book requests and user notifications.
