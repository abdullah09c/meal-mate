
## ✅ **Project Proposal**

### **Project Title:**

**MealMate: A Web-Based Mess Management System Using MySQL and JavaScript**

---

### **1. Introduction**

Managing daily meals, member deposits, and shared expenses in hostels or messes is a repetitive and error-prone task when done manually. **MealMate** is a web-based meal management system designed to automate and streamline this process using a structured relational database and a modern web interface.

Built with **MySQL** as the backend database and **JavaScript (Node.js + Express)** for server-side development, this system will allow mess managers to easily input, track, and retrieve daily meal data, financial transactions, and generate transparent reports for members.

---

### **2. Objective**

To build a **structured, normalized relational database system** that supports:

* Accurate recording of member meals, deposits, and shared expenses
* Automatic calculation of meal rate and member balance
* Reliable data retrieval through SQL queries and dynamic reports
* A web-based user interface for data entry and report viewing

---

### **3. System Modules**

| Module                        | Description                                          |
| ----------------------------- | ---------------------------------------------------- |
| **Member Management**         | Add, edit, or delete members of the mess             |
| **Meal Entry Module**         | Record number of meals per member per day            |
| **Deposit Module**            | Log monetary deposits made by members                |
| **Expense Module**            | Add daily bazaar or shared expenses                  |
| **Meal Rate Calculation**     | Compute cost per meal using total expenses and meals |
| **Balance Calculation**       | Determine financial balance for each member          |
| **Reports Module**            | View monthly summaries and printable reports         |
| **Admin Access** *(optional)* | Simple login/auth system for the mess manager        |

---

### **4. DBMS Features**

* ✅ **Relational Database** using **MySQL**
* ✅ Designed using **ER diagram** and normalized up to **Third Normal Form (3NF)**
* ✅ Use of:

  * **Primary Keys** to uniquely identify records (members, meals, expenses, deposits)
  * **Foreign Keys** to maintain relationships (e.g., meals linked to members)
  * **Constraints** (`NOT NULL`, `CHECK`, `UNIQUE`) to ensure valid data
* ✅ SQL Components:

  * Complex `SELECT` queries
  * `JOIN`s across multiple tables
  * `GROUP BY`, `ORDER BY` for aggregations
  * **Views** for monthly reports
  * **Stored Procedures/Functions** for meal rate and balance calculations
* ✅ Sample data will be inserted for demo and testing
* ✅ Report generation using SQL views or backend logic

---

### **5. Tools & Technologies**

| Category            | Tool / Language                              |
| ------------------- | -------------------------------------------- |
| **Database**        | MySQL                                        |
| **Backend**         | Node.js + Express.js                         |
| **Frontend**        | HTML, CSS, JavaScript                        |
| **Database Client** | mysql2 or Sequelize (Node.js ORM)            |
| **Diagram Tool**    | dbdiagram.io / MySQL Workbench               |
| **Testing Tools**   | Postman (for API testing), Browser Dev Tools |

---

### **6. Expected Outcomes**

* ✅ A fully functional and normalized **MySQL database** system
* ✅ A **web-based interface** to manage mess activities efficiently
* ✅ **Dynamic SQL queries and API endpoints** to fetch:

  * Total meals per member
  * Deposits and expenses
  * Meal rate
  * Member-wise balances
* ✅ Admin-generated reports for monthly summaries
* ✅ A scalable backend that can be integrated into real-world messes or hostels

---

### **7. Timeline**

| Phase        | Duration                              | Deliverables                       |
| ------------ | ------------------------------------- | ---------------------------------- |
| **Week 1–2** | ER diagram, requirement analysis      | Final schema, system plan          |
| **Week 3–4** | Database creation, sample data entry  | MySQL schema and dummy data        |
| **Week 5**   | API & query development using Node.js | Backend with SQL queries           |
| **Week 6**   | Web interface, testing, documentation | Frontend + complete working system |

---

### **8. Conclusion**

**MealMate** will deliver a practical, database-driven solution to a real-world problem using **MySQL** and **JavaScript**. It emphasizes clean relational design, efficient query usage, and web-based interaction. The system aims to improve the efficiency, accuracy, and transparency of mess or hostel management and serves as a strong demonstration of database and full-stack development skills.

