const { sequelize } = require("../config/database");
const { QueryTypes } = require("sequelize");



const validateUser = async (userId, userType) => {
  try {
    if (userType === 'doctor') {
      const [doctor] = await sequelize.query(
        'SELECT id FROM tele_doctor WHERE id = ?',
        {
          replacements: [userId],
          type: QueryTypes.SELECT
        }
      );
      return !!doctor;
    } else {
      // For admin and front_desk (both are in tele_users table)
      const [user] = await sequelize.query(
        'SELECT id FROM tele_users WHERE id = ? AND role = ?',
        {
          replacements: [userId, userType],
          type: QueryTypes.SELECT
        }
      );
      return !!user;
    }
  } catch (error) {
    console.error("Error validating user:", error);
    return false;
  }
};



// send..
const sendMessage = async (req, res) => {
  const { sender_id, sender_type, receiver_id, receiver_type, message } = req.body;

  try {
    // Validate both sender and receiver exist
    const senderExists = await validateUser(sender_id, sender_type);
    const receiverExists = await validateUser(receiver_id, receiver_type);

    if (!senderExists || !receiverExists) {
      return res.status(400).json({
        success: false,
        error: "Invalid sender or receiver"
      });
    }

    const [result] = await sequelize.query(
      `INSERT INTO tele_chat_messages 
       (sender_id, sender_type, receiver_id, receiver_type, message) 
       VALUES (?, ?, ?, ?, ?)`,
      {
        replacements: [sender_id, sender_type, receiver_id, receiver_type, message],
        type: QueryTypes.INSERT
      }
    );

    res.json({
      success: true,
      message: "Message sent successfully",
      message_id: result
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send message"
    });
  }
};




// get all chat for 2 users!
const getChatHistory = async (req, res) => {
  const { user1_id, user1_type, user2_id, user2_type } = req.query;

  try {
    // Validate both users exist
    const user1Exists = await validateUser(user1_id, user1_type);
    const user2Exists = await validateUser(user2_id, user2_type);

    if (!user1Exists || !user2Exists) {
      return res.status(400).json({
        success: false,
        error: "Invalid user(s)"
      });
    }

    const messages = await sequelize.query(
      `SELECT 
        m.*,
        CASE 
          WHEN m.sender_type = 'doctor' THEN d.doctor
          WHEN m.sender_type IN ('admin', 'front_desk') THEN CONCAT(u.firstname, ' ', u.lastname)
        END as sender_name,
        CASE 
          WHEN m.receiver_type = 'doctor' THEN d2.doctor
          WHEN m.receiver_type IN ('admin', 'front_desk') THEN CONCAT(u2.firstname, ' ', u2.lastname)
        END as receiver_name
       FROM tele_chat_messages m
       LEFT JOIN tele_doctor d ON m.sender_type = 'doctor' AND m.sender_id = d.id
       LEFT JOIN tele_users u ON m.sender_type IN ('admin', 'front_desk') AND m.sender_id = u.id
       LEFT JOIN tele_doctor d2 ON m.receiver_type = 'doctor' AND m.receiver_id = d2.id
       LEFT JOIN tele_users u2 ON m.receiver_type IN ('admin', 'front_desk') AND m.receiver_id = u2.id
       WHERE (m.sender_id = ? AND m.sender_type = ? AND m.receiver_id = ? AND m.receiver_type = ?)
       OR (m.sender_id = ? AND m.sender_type = ? AND m.receiver_id = ? AND m.receiver_type = ?)
       ORDER BY m.created_at ASC`,
      {
        replacements: [
          user1_id, user1_type, user2_id, user2_type,
          user2_id, user2_type, user1_id, user1_type
        ],
        type: QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch chat history"
    });
  }
};



const getChatParticipants = async (req, res) => {
  const { user_id, user_type } = req.query;

  try {
    const participants = await sequelize.query(
      `
    SELECT DISTINCT 
        d.id AS doctor_id,
        d.doctor AS doctor_name,
        u.id AS user_id,
        CONCAT(u.firstname, ' ', u.lastname) AS user_name,
        CASE 
            WHEN u.role = 'admin' THEN 'admin'
            WHEN u.role = 'front_desk' THEN 'front_desk'
        END AS participant_type
        FROM tele_chat_messages m
        LEFT JOIN tele_doctor d 
        ON (m.sender_type = 'doctor' AND m.sender_id = d.id)
        OR (m.receiver_type = 'doctor' AND m.receiver_id = d.id)
        LEFT JOIN tele_users u 
        ON (m.sender_type IN ('admin', 'front_desk') AND m.sender_id = u.id)
        OR (m.receiver_type IN ('admin', 'front_desk') AND m.receiver_id = u.id)
        WHERE 
        (m.sender_id = :user_id AND m.sender_type = :user_type)
        OR 
        (m.receiver_id = :user_id AND m.receiver_type = :user_type)

       `,
      {
        replacements: {user_id, user_type},
        type: QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      data: participants
    });
  } catch (error) {
    console.error("Error fetching chat participants:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch chat participants"
    });
  }
};



// mark as read
const markMessagesAsRead = async (req, res) => {
  const { sender_id, sender_type, receiver_id, receiver_type } = req.body;

  try {
    await sequelize.query(
      `UPDATE tele_chat_messages 
       SET is_read = TRUE 
       WHERE sender_id = ? AND sender_type = ? 
       AND receiver_id = ? AND receiver_type = ? 
       AND is_read = FALSE`,
      {
        replacements: [sender_id, sender_type, receiver_id, receiver_type],
        type: QueryTypes.UPDATE
      }
    );

    res.json({
      success: true,
      message: "Messages marked as read"
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({
      success: false,
      error: "Failed to mark messages as read"
    });
  }
};


// unread
const getUnreadCount = async (req, res) => {
  const { receiver_id, receiver_type } = req.query;

  try {
    const [result] = await sequelize.query(
      `SELECT COUNT(*) as unread_count 
       FROM tele_chat_messages 
       WHERE receiver_id = ? AND receiver_type = ? AND is_read = FALSE`,
      {
        replacements: [receiver_id, receiver_type],
        type: QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      unread_count: result.unread_count
    });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get unread count"
    });
  }
};



module.exports = {
  sendMessage,
  getChatHistory,
  markMessagesAsRead,
  getUnreadCount,
  getChatParticipants

};