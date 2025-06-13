const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');


router.post('/send', chatController.sendMessage);

// all chats
router.get('/history', chatController.getChatHistory);

router.post('/mark-read', chatController.markMessagesAsRead);

router.get('/participants', chatController.getChatParticipants);

// unread cnt
router.get('/unread-count', chatController.getUnreadCount);

module.exports = router;