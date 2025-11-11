// ============= SECURITY HANDLER =============
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();
const SECURITY_EVENTS_TABLE = process.env.SECURITY_EVENTS_TABLE;
const VISITORS_TABLE = process.env.VISITORS_TABLE;
const ACCESS_LOGS_TABLE = process.env.ACCESS_LOGS_TABLE;

const createResponse = (statusCode, body) => ({
    statusCode,
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify(body)
});

// GET /security/events
exports.getSecurityEvents = async (event) => {
    try {
        const { severity, type, startDate, endDate, limit = 100 } = event.queryStringParameters || {};
        
        let params = {
            TableName: SECURITY_EVENTS_TABLE,
            Limit: parseInt(limit)
        };

        // Add filters if provided
        const conditions = [];
        const expressionAttributeValues = {};
        
        if (severity) {
            conditions.push('severity = :severity');
            expressionAttributeValues[':severity'] = severity;
        }
        
        if (type) {
            conditions.push('#type = :type');
            params.ExpressionAttributeNames = { '#type': 'type' };
            expressionAttributeValues[':type'] = type;
        }
        
        if (startDate && endDate) {
            conditions.push('#timestamp BETWEEN :startDate AND :endDate');
            params.ExpressionAttributeNames = { 
                ...params.ExpressionAttributeNames,
                '#timestamp': 'timestamp' 
            };
            expressionAttributeValues[':startDate'] = startDate;
            expressionAttributeValues[':endDate'] = endDate;
        }
        
        if (conditions.length > 0) {
            params.FilterExpression = conditions.join(' AND ');
            params.ExpressionAttributeValues = expressionAttributeValues;
        }

        const result = await dynamodb.scan(params).promise();
        
        // Sort by timestamp descending
        const sortedEvents = result.Items.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        return createResponse(200, {
            success: true,
            data: sortedEvents
        });
        
    } catch (error) {
        console.error('Error getting security events:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// POST /security/events
exports.createSecurityEvent = async (event) => {
    try {
        const data = JSON.parse(event.body);
        
        // Validate required fields
        const requiredFields = ['type', 'description', 'location', 'severity'];
        for (const field of requiredFields) {
            if (!data[field]) {
                return createResponse(400, {
                    success: false,
                    error: `Missing required field: ${field}`
                });
            }
        }
        
        const securityEvent = {
            id: uuidv4(),
            ...data,
            timestamp: new Date().toISOString(),
            tenantId: event.requestContext.authorizer?.claims?.['custom:tenant_id'] || 'default',
            userId: event.requestContext.authorizer?.claims?.sub,
            userName: event.requestContext.authorizer?.claims?.name || 'System'
        };
        
        await dynamodb.put({
            TableName: SECURITY_EVENTS_TABLE,
            Item: securityEvent
        }).promise();
        
        // Send notification for critical events
        if (data.severity === 'critical' || data.severity === 'high') {
            await sendSecurityAlert(securityEvent);
        }
        
        return createResponse(201, {
            success: true,
            data: securityEvent
        });
        
    } catch (error) {
        console.error('Error creating security event:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// POST /security/emergency-alert
exports.triggerEmergencyAlert = async (event) => {
    try {
        const data = JSON.parse(event.body);
        
        const emergencyEvent = {
            id: uuidv4(),
            type: 'emergency_alert',
            description: data.description || 'Emergency alert activated',
            location: data.location || 'Unknown',
            severity: 'critical',
            timestamp: new Date().toISOString(),
            tenantId: event.requestContext.authorizer?.claims?.['custom:tenant_id'] || 'default',
            userId: event.requestContext.authorizer?.claims?.sub,
            userName: event.requestContext.authorizer?.claims?.name || 'System'
        };
        
        await dynamodb.put({
            TableName: SECURITY_EVENTS_TABLE,
            Item: emergencyEvent
        }).promise();
        
        // Send emergency notifications
        await sendEmergencyAlert(emergencyEvent);
        
        return createResponse(201, {
            success: true,
            data: emergencyEvent,
            message: 'Emergency alert activated successfully'
        });
        
    } catch (error) {
        console.error('Error triggering emergency alert:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// GET /security/visitors
exports.getVisitors = async (event) => {
    try {
        const { status, date, unitNumber } = event.queryStringParameters || {};
        
        let params = {
            TableName: VISITORS_TABLE
        };

        // Add filters if provided
        const conditions = [];
        const expressionAttributeValues = {};
        
        if (status) {
            conditions.push('#status = :status');
            params.ExpressionAttributeNames = { '#status': 'status' };
            expressionAttributeValues[':status'] = status;
        }
        
        if (date) {
            conditions.push('begins_with(visitDate, :date)');
            expressionAttributeValues[':date'] = date;
        }
        
        if (unitNumber) {
            conditions.push('visitingUnit = :unitNumber');
            expressionAttributeValues[':unitNumber'] = unitNumber;
        }
        
        if (conditions.length > 0) {
            params.FilterExpression = conditions.join(' AND ');
            params.ExpressionAttributeValues = expressionAttributeValues;
        }

        const result = await dynamodb.scan(params).promise();
        
        // Sort by visit date and time
        const sortedVisitors = result.Items.sort((a, b) => {
            const aDateTime = new Date(`${a.visitDate} ${a.visitTime}`);
            const bDateTime = new Date(`${b.visitDate} ${b.visitTime}`);
            return bDateTime - aDateTime;
        });
        
        return createResponse(200, {
            success: true,
            data: sortedVisitors
        });
        
    } catch (error) {
        console.error('Error getting visitors:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// POST /security/visitors
exports.addVisitor = async (event) => {
    try {
        const data = JSON.parse(event.body);
        
        // Validate required fields
        const requiredFields = ['name', 'phone', 'visitingUnit', 'visitDate', 'visitTime', 'purpose'];
        for (const field of requiredFields) {
            if (!data[field]) {
                return createResponse(400, {
                    success: false,
                    error: `Missing required field: ${field}`
                });
            }
        }
        
        const visitor = {
            id: uuidv4(),
            ...data,
            status: 'expected',
            createdAt: new Date().toISOString(),
            tenantId: event.requestContext.authorizer?.claims?.['custom:tenant_id'] || 'default',
            createdBy: event.requestContext.authorizer?.claims?.sub
        };
        
        await dynamodb.put({
            TableName: VISITORS_TABLE,
            Item: visitor
        }).promise();
        
        // Log security event
        await logSecurityEvent({
            type: 'visitor_registered',
            description: `Visitor ${data.name} registered for unit ${data.visitingUnit}`,
            location: `Unit ${data.visitingUnit}`,
            severity: 'info',
            userId: visitor.createdBy
        });
        
        return createResponse(201, {
            success: true,
            data: visitor
        });
        
    } catch (error) {
        console.error('Error adding visitor:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// PUT /security/visitors/{id}/checkin
exports.checkInVisitor = async (event) => {
    try {
        const { id } = event.pathParameters;
        
        const visitor = await dynamodb.get({
            TableName: VISITORS_TABLE,
            Key: { id }
        }).promise();
        
        if (!visitor.Item) {
            return createResponse(404, {
                success: false,
                error: 'Visitor not found'
            });
        }
        
        if (visitor.Item.status !== 'expected') {
            return createResponse(400, {
                success: false,
                error: 'Visitor cannot be checked in'
            });
        }
        
        const checkInTime = new Date().toISOString();
        
        await dynamodb.update({
            TableName: VISITORS_TABLE,
            Key: { id },
            UpdateExpression: 'SET #status = :status, checkInTime = :checkInTime',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
                ':status': 'checked_in',
                ':checkInTime': checkInTime
            }
        }).promise();
        
        // Log access event
        await logAccessEvent({
            userId: visitor.Item.id,
            userName: visitor.Item.name,
            action: 'entry',
            location: `Unit ${visitor.Item.visitingUnit}`,
            method: 'visitor_checkin',
            status: 'success'
        });
        
        return createResponse(200, {
            success: true,
            message: 'Visitor checked in successfully'
        });
        
    } catch (error) {
        console.error('Error checking in visitor:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// GET /security/access-logs
exports.getAccessLogs = async (event) => {
    try {
        const { date, userId, location, status } = event.queryStringParameters || {};
        
        let params = {
            TableName: ACCESS_LOGS_TABLE,
            Limit: 500
        };

        // Add filters if provided
        const conditions = [];
        const expressionAttributeValues = {};
        
        if (date) {
            conditions.push('begins_with(#timestamp, :date)');
            params.ExpressionAttributeNames = { '#timestamp': 'timestamp' };
            expressionAttributeValues[':date'] = date;
        }
        
        if (userId) {
            conditions.push('userId = :userId');
            expressionAttributeValues[':userId'] = userId;
        }
        
        if (location) {
            conditions.push('#location = :location');
            params.ExpressionAttributeNames = { 
                ...params.ExpressionAttributeNames,
                '#location': 'location' 
            };
            expressionAttributeValues[':location'] = location;
        }
        
        if (status) {
            conditions.push('#status = :status');
            params.ExpressionAttributeNames = { 
                ...params.ExpressionAttributeNames,
                '#status': 'status' 
            };
            expressionAttributeValues[':status'] = status;
        }
        
        if (conditions.length > 0) {
            params.FilterExpression = conditions.join(' AND ');
            params.ExpressionAttributeValues = expressionAttributeValues;
        }

        const result = await dynamodb.scan(params).promise();
        
        // Sort by timestamp descending
        const sortedLogs = result.Items.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        return createResponse(200, {
            success: true,
            data: sortedLogs
        });
        
    } catch (error) {
        console.error('Error getting access logs:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// GET /security/stats
exports.getSecurityStats = async (event) => {
    try {
        const [eventsResult, visitorsResult, logsResult] = await Promise.all([
            dynamodb.scan({ TableName: SECURITY_EVENTS_TABLE }).promise(),
            dynamodb.scan({ TableName: VISITORS_TABLE }).promise(),
            dynamodb.scan({ TableName: ACCESS_LOGS_TABLE }).promise()
        ]);
        
        const events = eventsResult.Items;
        const visitors = visitorsResult.Items;
        const logs = logsResult.Items;
        
        const today = new Date().toISOString().split('T')[0];
        
        const stats = {
            totalEvents: events.length,
            criticalEvents: events.filter(e => e.severity === 'critical' || e.severity === 'high').length,
            activeVisitors: visitors.filter(v => v.status === 'checked_in').length,
            accessAttempts: logs.filter(l => l.timestamp.startsWith(today)).length,
            systemStatus: 'online'
        };
        
        return createResponse(200, {
            success: true,
            data: stats
        });
        
    } catch (error) {
        console.error('Error getting security stats:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// Helper functions
const sendSecurityAlert = async (securityEvent) => {
    try {
        const message = {
            default: `Security Alert: ${securityEvent.description}`,
            email: `
                Security Alert - ${securityEvent.severity.toUpperCase()}
                
                Type: ${securityEvent.type}
                Description: ${securityEvent.description}
                Location: ${securityEvent.location}
                Time: ${securityEvent.timestamp}
                
                Please take appropriate action immediately.
            `
        };
        
        await sns.publish({
            TopicArn: process.env.SECURITY_ALERTS_TOPIC,
            Message: JSON.stringify(message),
            MessageStructure: 'json',
            Subject: `Security Alert - ${securityEvent.severity.toUpperCase()}`
        }).promise();
        
    } catch (error) {
        console.error('Error sending security alert:', error);
    }
};

const sendEmergencyAlert = async (emergencyEvent) => {
    try {
        const message = {
            default: `EMERGENCY ALERT: ${emergencyEvent.description}`,
            email: `
                🚨 EMERGENCY ALERT 🚨
                
                Description: ${emergencyEvent.description}
                Location: ${emergencyEvent.location}
                Time: ${emergencyEvent.timestamp}
                Triggered by: ${emergencyEvent.userName}
                
                IMMEDIATE ACTION REQUIRED
            `,
            sms: `EMERGENCY ALERT: ${emergencyEvent.description} at ${emergencyEvent.location}. Time: ${new Date(emergencyEvent.timestamp).toLocaleString()}`
        };
        
        await sns.publish({
            TopicArn: process.env.EMERGENCY_ALERTS_TOPIC,
            Message: JSON.stringify(message),
            MessageStructure: 'json',
            Subject: '🚨 EMERGENCY ALERT 🚨'
        }).promise();
        
    } catch (error) {
        console.error('Error sending emergency alert:', error);
    }
};

const logSecurityEvent = async (eventData) => {
    try {
        const securityEvent = {
            id: uuidv4(),
            ...eventData,
            timestamp: new Date().toISOString()
        };
        
        await dynamodb.put({
            TableName: SECURITY_EVENTS_TABLE,
            Item: securityEvent
        }).promise();
        
    } catch (error) {
        console.error('Error logging security event:', error);
    }
};

const logAccessEvent = async (eventData) => {
    try {
        const accessEvent = {
            id: uuidv4(),
            ...eventData,
            timestamp: new Date().toISOString()
        };
        
        await dynamodb.put({
            TableName: ACCESS_LOGS_TABLE,
            Item: accessEvent
        }).promise();
        
    } catch (error) {
        console.error('Error logging access event:', error);
    }
};

// ============= COMMUNICATION HANDLER =============
const MESSAGES_TABLE = process.env.MESSAGES_TABLE;
const ANNOUNCEMENTS_TABLE = process.env.ANNOUNCEMENTS_TABLE;

// GET /communication/messages
exports.getMessages = async (event) => {
    try {
        const userId = event.requestContext.authorizer?.claims?.sub;
        const { status, messageType } = event.queryStringParameters || {};
        
        let params = {
            TableName: MESSAGES_TABLE,
            FilterExpression: 'recipientId = :userId OR senderUserId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId
            }
        };

        // Add additional filters
        if (status) {
            params.FilterExpression += ' AND #status = :status';
            params.ExpressionAttributeNames = { '#status': 'status' };
            params.ExpressionAttributeValues[':status'] = status;
        }
        
        if (messageType) {
            params.FilterExpression += ' AND messageType = :messageType';
            params.ExpressionAttributeValues[':messageType'] = messageType;
        }

        const result = await dynamodb.scan(params).promise();
        
        // Sort by timestamp descending
        const sortedMessages = result.Items.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        return createResponse(200, {
            success: true,
            data: sortedMessages
        });
        
    } catch (error) {
        console.error('Error getting messages:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// POST /communication/messages
exports.sendMessage = async (event) => {
    try {
        const data = JSON.parse(event.body);
        const senderUserId = event.requestContext.authorizer?.claims?.sub;
        const senderName = event.requestContext.authorizer?.claims?.name || 'Unknown User';
        
        // Validate required fields
        const requiredFields = ['subject', 'content'];
        for (const field of requiredFields) {
            if (!data[field]) {
                return createResponse(400, {
                    success: false,
                    error: `Missing required field: ${field}`
                });
            }
        }
        
        // Determine recipients
        let recipients = [];
        
        if (data.recipientType === 'individual' && data.recipientId) {
            recipients = [data.recipientId];
        } else if (data.recipientType === 'group' && data.groupId) {
            // Get group members (implementation depends on your group structure)
            recipients = await getGroupMembers(data.groupId);
        } else if (data.recipientType === 'all') {
            // Get all residents
            const residentsResult = await dynamodb.scan({
                TableName: process.env.RESIDENTS_TABLE
            }).promise();
            recipients = residentsResult.Items.map(resident => resident.id);
        }
        
        if (recipients.length === 0) {
            return createResponse(400, {
                success: false,
                error: 'No valid recipients found'
            });
        }
        
        // Create message for each recipient
        const messages = [];
        for (const recipientId of recipients) {
            const message = {
                id: uuidv4(),
                senderUserId,
                senderName,
                recipientId,
                subject: data.subject,
                content: data.content,
                messageType: data.messageType || 'personal',
                priority: data.priority || 'medium',
                isRead: false,
                timestamp: new Date().toISOString(),
                tenantId: event.requestContext.authorizer?.claims?.['custom:tenant_id'] || 'default'
            };
            
            await dynamodb.put({
                TableName: MESSAGES_TABLE,
                Item: message
            }).promise();
            
            messages.push(message);
        }
        
        // Send push notifications
        await sendMessageNotifications(messages);
        
        return createResponse(201, {
            success: true,
            data: messages[0], // Return first message as sample
            message: `Message sent to ${recipients.length} recipient(s)`
        });
        
    } catch (error) {
        console.error('Error sending message:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// PUT /communication/messages/{id}/read
exports.markMessageAsRead = async (event) => {
    try {
        const { id } = event.pathParameters;
        const userId = event.requestContext.authorizer?.claims?.sub;
        
        // Verify message belongs to user
        const message = await dynamodb.get({
            TableName: MESSAGES_TABLE,
            Key: { id }
        }).promise();
        
        if (!message.Item) {
            return createResponse(404, {
                success: false,
                error: 'Message not found'
            });
        }
        
        if (message.Item.recipientId !== userId) {
            return createResponse(403, {
                success: false,
                error: 'Access denied'
            });
        }
        
        await dynamodb.update({
            TableName: MESSAGES_TABLE,
            Key: { id },
            UpdateExpression: 'SET isRead = :isRead, readAt = :readAt',
            ExpressionAttributeValues: {
                ':isRead': true,
                ':readAt': new Date().toISOString()
            }
        }).promise();
        
        return createResponse(200, {
            success: true,
            message: 'Message marked as read'
        });
        
    } catch (error) {
        console.error('Error marking message as read:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// GET /communication/announcements
exports.getAnnouncements = async (event) => {
    try {
        const { active } = event.queryStringParameters || {};
        
        let params = {
            TableName: ANNOUNCEMENTS_TABLE
        };

        // Filter for active announcements only
        if (active === 'true') {
            const now = new Date().toISOString();
            params.FilterExpression = 'attribute_not_exists(expirationDate) OR expirationDate > :now';
            params.ExpressionAttributeValues = { ':now': now };
        }

        const result = await dynamodb.scan(params).promise();
        
        // Sort by timestamp descending
        const sortedAnnouncements = result.Items.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        return createResponse(200, {
            success: true,
            data: sortedAnnouncements
        });
        
    } catch (error) {
        console.error('Error getting announcements:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// POST /communication/announcements
exports.createAnnouncement = async (event) => {
    try {
        const data = JSON.parse(event.body);
        const authorId = event.requestContext.authorizer?.claims?.sub;
        const authorName = event.requestContext.authorizer?.claims?.name || 'Unknown User';
        
        // Validate required fields
        const requiredFields = ['title', 'content'];
        for (const field of requiredFields) {
            if (!data[field]) {
                return createResponse(400, {
                    success: false,
                    error: `Missing required field: ${field}`
                });
            }
        }
        
        const announcement = {
            id: uuidv4(),
            ...data,
            authorId,
            author: authorName,
            timestamp: new Date().toISOString(),
            tenantId: event.requestContext.authorizer?.claims?.['custom:tenant_id'] || 'default'
        };
        
        await dynamodb.put({
            TableName: ANNOUNCEMENTS_TABLE,
            Item: announcement
        }).promise();
        
        // Send announcement notifications
        await sendAnnouncementNotifications(announcement);
        
        return createResponse(201, {
            success: true,
            data: announcement
        });
        
    } catch (error) {
        console.error('Error creating announcement:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// Helper functions for communication
const getGroupMembers = async (groupId) => {
    // Implementation depends on your group structure
    // This is a placeholder
    return [];
};

const sendMessageNotifications = async (messages) => {
    try {
        // Implementation for push notifications
        // This would integrate with SNS, FCM, or APNS
        console.log(`Sending notifications for ${messages.length} messages`);
    } catch (error) {
        console.error('Error sending message notifications:', error);
    }
};

const sendAnnouncementNotifications = async (announcement) => {
    try {
        // Implementation for announcement notifications
        console.log(`Sending announcement notification: ${announcement.title}`);
    } catch (error) {
        console.error('Error sending announcement notifications:', error);
    }
};
