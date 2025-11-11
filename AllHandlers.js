// ============= RESIDENTS HANDLER =============
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.RESIDENTS_TABLE;

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

// GET /residents
exports.getResidents = async (event) => {
    try {
        const { page = 1, limit = 50, status, unitNumber } = event.queryStringParameters || {};
        
        let params = {
            TableName: TABLE_NAME
        };

        // Add filters if provided
        if (status || unitNumber) {
            params.FilterExpression = '';
            params.ExpressionAttributeValues = {};
            
            const conditions = [];
            
            if (status) {
                conditions.push('#status = :status');
                params.ExpressionAttributeNames = { '#status': 'status' };
                params.ExpressionAttributeValues[':status'] = status;
            }
            
            if (unitNumber) {
                conditions.push('unitNumber = :unitNumber');
                params.ExpressionAttributeValues[':unitNumber'] = unitNumber;
            }
            
            params.FilterExpression = conditions.join(' AND ');
        }

        const result = await dynamodb.scan(params).promise();
        
        // Implement pagination
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const endIndex = startIndex + parseInt(limit);
        const paginatedItems = result.Items.slice(startIndex, endIndex);
        
        return createResponse(200, {
            success: true,
            data: {
                items: paginatedItems,
                totalCount: result.Items.length,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(result.Items.length / parseInt(limit))
            }
        });
        
    } catch (error) {
        console.error('Error getting residents:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// GET /residents/{id}
exports.getResident = async (event) => {
    try {
        const { id } = event.pathParameters;
        
        const params = {
            TableName: TABLE_NAME,
            Key: { id }
        };
        
        const result = await dynamodb.get(params).promise();
        
        if (!result.Item) {
            return createResponse(404, {
                success: false,
                error: 'Resident not found'
            });
        }
        
        return createResponse(200, {
            success: true,
            data: result.Item
        });
        
    } catch (error) {
        console.error('Error getting resident:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// POST /residents
exports.createResident = async (event) => {
    try {
        const data = JSON.parse(event.body);
        
        // Validate required fields
        const requiredFields = ['name', 'email', 'phone', 'unitNumber'];
        for (const field of requiredFields) {
            if (!data[field]) {
                return createResponse(400, {
                    success: false,
                    error: `Missing required field: ${field}`
                });
            }
        }
        
        // Check if email already exists
        const existingResident = await dynamodb.scan({
            TableName: TABLE_NAME,
            FilterExpression: 'email = :email',
            ExpressionAttributeValues: { ':email': data.email }
        }).promise();
        
        if (existingResident.Items.length > 0) {
            return createResponse(409, {
                success: false,
                error: 'Email already exists'
            });
        }
        
        const resident = {
            id: uuidv4(),
            ...data,
            status: data.status || 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tenantId: event.requestContext.authorizer?.claims?.['custom:tenant_id'] || 'default'
        };
        
        await dynamodb.put({
            TableName: TABLE_NAME,
            Item: resident
        }).promise();
        
        return createResponse(201, {
            success: true,
            data: resident
        });
        
    } catch (error) {
        console.error('Error creating resident:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// PUT /residents/{id}
exports.updateResident = async (event) => {
    try {
        const { id } = event.pathParameters;
        const data = JSON.parse(event.body);
        
        // Check if resident exists
        const existingResident = await dynamodb.get({
            TableName: TABLE_NAME,
            Key: { id }
        }).promise();
        
        if (!existingResident.Item) {
            return createResponse(404, {
                success: false,
                error: 'Resident not found'
            });
        }
        
        // Build update expression
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        
        const allowedFields = ['name', 'email', 'phone', 'unitNumber', 'status', 'emergencyContact', 'preferences'];
        
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                updateExpressions.push(`#${field} = :${field}`);
                expressionAttributeNames[`#${field}`] = field;
                expressionAttributeValues[`:${field}`] = data[field];
            }
        });
        
        if (updateExpressions.length === 0) {
            return createResponse(400, {
                success: false,
                error: 'No valid fields to update'
            });
        }
        
        // Add updatedAt
        updateExpressions.push('#updatedAt = :updatedAt');
        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        expressionAttributeValues[':updatedAt'] = new Date().toISOString();
        
        const params = {
            TableName: TABLE_NAME,
            Key: { id },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        };
        
        const result = await dynamodb.update(params).promise();
        
        return createResponse(200, {
            success: true,
            data: result.Attributes
        });
        
    } catch (error) {
        console.error('Error updating resident:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// DELETE /residents/{id}
exports.deleteResident = async (event) => {
    try {
        const { id } = event.pathParameters;
        
        // Check if resident exists
        const existingResident = await dynamodb.get({
            TableName: TABLE_NAME,
            Key: { id }
        }).promise();
        
        if (!existingResident.Item) {
            return createResponse(404, {
                success: false,
                error: 'Resident not found'
            });
        }
        
        await dynamodb.delete({
            TableName: TABLE_NAME,
            Key: { id }
        }).promise();
        
        return createResponse(200, {
            success: true,
            message: 'Resident deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting resident:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// ============= PAYMENTS HANDLER =============
const PAYMENTS_TABLE = process.env.PAYMENTS_TABLE;

// GET /payments
exports.getPayments = async (event) => {
    try {
        const { residentId, status, method, startDate, endDate } = event.queryStringParameters || {};
        
        let params = {
            TableName: PAYMENTS_TABLE
        };

        // Add filters if provided
        const conditions = [];
        const expressionAttributeValues = {};
        
        if (residentId) {
            conditions.push('residentId = :residentId');
            expressionAttributeValues[':residentId'] = residentId;
        }
        
        if (status) {
            conditions.push('#status = :status');
            params.ExpressionAttributeNames = { '#status': 'status' };
            expressionAttributeValues[':status'] = status;
        }
        
        if (method) {
            conditions.push('method = :method');
            expressionAttributeValues[':method'] = method;
        }
        
        if (startDate && endDate) {
            conditions.push('#date BETWEEN :startDate AND :endDate');
            params.ExpressionAttributeNames = { 
                ...params.ExpressionAttributeNames,
                '#date': 'date' 
            };
            expressionAttributeValues[':startDate'] = startDate;
            expressionAttributeValues[':endDate'] = endDate;
        }
        
        if (conditions.length > 0) {
            params.FilterExpression = conditions.join(' AND ');
            params.ExpressionAttributeValues = expressionAttributeValues;
        }

        const result = await dynamodb.scan(params).promise();
        
        // Sort by date descending
        const sortedPayments = result.Items.sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        return createResponse(200, {
            success: true,
            data: sortedPayments
        });
        
    } catch (error) {
        console.error('Error getting payments:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// POST /payments
exports.processPayment = async (event) => {
    try {
        const data = JSON.parse(event.body);
        
        // Validate required fields
        const requiredFields = ['residentId', 'amount', 'method'];
        for (const field of requiredFields) {
            if (!data[field]) {
                return createResponse(400, {
                    success: false,
                    error: `Missing required field: ${field}`
                });
            }
        }
        
        // Validate amount
        if (data.amount <= 0) {
            return createResponse(400, {
                success: false,
                error: 'Amount must be greater than 0'
            });
        }
        
        // Get resident information
        const resident = await dynamodb.get({
            TableName: TABLE_NAME,
            Key: { id: data.residentId }
        }).promise();
        
        if (!resident.Item) {
            return createResponse(404, {
                success: false,
                error: 'Resident not found'
            });
        }
        
        const payment = {
            id: uuidv4(),
            residentId: data.residentId,
            residentName: resident.Item.name,
            residentEmail: resident.Item.email,
            unitNumber: resident.Item.unitNumber,
            amount: data.amount,
            method: data.method,
            description: data.description || '',
            status: 'pending',
            date: new Date().toISOString(),
            transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            tenantId: event.requestContext.authorizer?.claims?.['custom:tenant_id'] || 'default'
        };
        
        // Simulate payment processing
        const processingResult = await simulatePaymentProcessing(payment);
        payment.status = processingResult.status;
        
        if (processingResult.status === 'failed') {
            payment.errorMessage = processingResult.error;
        }
        
        await dynamodb.put({
            TableName: PAYMENTS_TABLE,
            Item: payment
        }).promise();
        
        return createResponse(201, {
            success: true,
            data: payment
        });
        
    } catch (error) {
        console.error('Error processing payment:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// POST /payments/{id}/refund
exports.refundPayment = async (event) => {
    try {
        const { id } = event.pathParameters;
        const { reason } = JSON.parse(event.body);
        
        // Get payment
        const payment = await dynamodb.get({
            TableName: PAYMENTS_TABLE,
            Key: { id }
        }).promise();
        
        if (!payment.Item) {
            return createResponse(404, {
                success: false,
                error: 'Payment not found'
            });
        }
        
        if (payment.Item.status !== 'completed') {
            return createResponse(400, {
                success: false,
                error: 'Only completed payments can be refunded'
            });
        }
        
        // Process refund
        const refundInfo = {
            date: new Date().toISOString(),
            reason: reason || 'Refund requested',
            amount: payment.Item.amount,
            refundId: `REF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        await dynamodb.update({
            TableName: PAYMENTS_TABLE,
            Key: { id },
            UpdateExpression: 'SET #status = :status, refundInfo = :refundInfo, updatedAt = :updatedAt',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
                ':status': 'refunded',
                ':refundInfo': refundInfo,
                ':updatedAt': new Date().toISOString()
            }
        }).promise();
        
        const updatedPayment = {
            ...payment.Item,
            status: 'refunded',
            refundInfo,
            updatedAt: new Date().toISOString()
        };
        
        return createResponse(200, {
            success: true,
            data: updatedPayment
        });
        
    } catch (error) {
        console.error('Error refunding payment:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// GET /payments/stats
exports.getPaymentStats = async (event) => {
    try {
        const result = await dynamodb.scan({
            TableName: PAYMENTS_TABLE
        }).promise();
        
        const payments = result.Items;
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const stats = {
            totalRevenue: 0,
            pendingAmount: 0,
            completedCount: 0,
            failedCount: 0,
            monthlyRevenue: 0
        };
        
        payments.forEach(payment => {
            const paymentDate = new Date(payment.date);
            
            if (payment.status === 'completed') {
                stats.totalRevenue += payment.amount;
                stats.completedCount++;
                
                if (paymentDate.getMonth() === currentMonth && 
                    paymentDate.getFullYear() === currentYear) {
                    stats.monthlyRevenue += payment.amount;
                }
            } else if (payment.status === 'pending') {
                stats.pendingAmount += payment.amount;
            } else if (payment.status === 'failed') {
                stats.failedCount++;
            }
        });
        
        return createResponse(200, {
            success: true,
            data: stats
        });
        
    } catch (error) {
        console.error('Error getting payment stats:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// Simulate payment processing
const simulatePaymentProcessing = async (payment) => {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate success/failure (90% success rate)
    const success = Math.random() > 0.1;
    
    if (success) {
        return { status: 'completed' };
    } else {
        return { 
            status: 'failed', 
            error: 'Payment processing failed - insufficient funds' 
        };
    }
};

// ============= MAINTENANCE HANDLER =============
const WORK_ORDERS_TABLE = process.env.WORK_ORDERS_TABLE;

// GET /maintenance/work-orders
exports.getWorkOrders = async (event) => {
    try {
        const { status, priority, type, assignedTo } = event.queryStringParameters || {};
        
        let params = {
            TableName: WORK_ORDERS_TABLE
        };

        // Add filters if provided
        const conditions = [];
        const expressionAttributeValues = {};
        
        if (status) {
            conditions.push('#status = :status');
            params.ExpressionAttributeNames = { '#status': 'status' };
            expressionAttributeValues[':status'] = status;
        }
        
        if (priority) {
            conditions.push('priority = :priority');
            expressionAttributeValues[':priority'] = priority;
        }
        
        if (type) {
            conditions.push('#type = :type');
            params.ExpressionAttributeNames = { 
                ...params.ExpressionAttributeNames,
                '#type': 'type' 
            };
            expressionAttributeValues[':type'] = type;
        }
        
        if (assignedTo) {
            conditions.push('assignedTo = :assignedTo');
            expressionAttributeValues[':assignedTo'] = assignedTo;
        }
        
        if (conditions.length > 0) {
            params.FilterExpression = conditions.join(' AND ');
            params.ExpressionAttributeValues = expressionAttributeValues;
        }

        const result = await dynamodb.scan(params).promise();
        
        // Sort by priority and creation date
        const sortedWorkOrders = result.Items.sort((a, b) => {
            const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
            const aPriority = priorityOrder[a.priority] || 0;
            const bPriority = priorityOrder[b.priority] || 0;
            
            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }
            
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        return createResponse(200, {
            success: true,
            data: sortedWorkOrders
        });
        
    } catch (error) {
        console.error('Error getting work orders:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// POST /maintenance/work-orders
exports.createWorkOrder = async (event) => {
    try {
        const data = JSON.parse(event.body);
        
        // Validate required fields
        const requiredFields = ['title', 'description', 'priority', 'type', 'location'];
        for (const field of requiredFields) {
            if (!data[field]) {
                return createResponse(400, {
                    success: false,
                    error: `Missing required field: ${field}`
                });
            }
        }
        
        const workOrder = {
            id: uuidv4(),
            ...data,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tenantId: event.requestContext.authorizer?.claims?.['custom:tenant_id'] || 'default',
            createdBy: event.requestContext.authorizer?.claims?.sub || 'system'
        };
        
        await dynamodb.put({
            TableName: WORK_ORDERS_TABLE,
            Item: workOrder
        }).promise();
        
        return createResponse(201, {
            success: true,
            data: workOrder
        });
        
    } catch (error) {
        console.error('Error creating work order:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// PUT /maintenance/work-orders/{id}
exports.updateWorkOrder = async (event) => {
    try {
        const { id } = event.pathParameters;
        const data = JSON.parse(event.body);
        
        // Check if work order exists
        const existingWorkOrder = await dynamodb.get({
            TableName: WORK_ORDERS_TABLE,
            Key: { id }
        }).promise();
        
        if (!existingWorkOrder.Item) {
            return createResponse(404, {
                success: false,
                error: 'Work order not found'
            });
        }
        
        // Build update expression
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        
        const allowedFields = [
            'title', 'description', 'status', 'priority', 'type', 'location',
            'assignedTo', 'scheduledDate', 'completedDate', 'estimatedCost', 'actualCost'
        ];
        
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                updateExpressions.push(`#${field} = :${field}`);
                expressionAttributeNames[`#${field}`] = field;
                expressionAttributeValues[`:${field}`] = data[field];
            }
        });
        
        if (updateExpressions.length === 0) {
            return createResponse(400, {
                success: false,
                error: 'No valid fields to update'
            });
        }
        
        // Add updatedAt
        updateExpressions.push('#updatedAt = :updatedAt');
        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        expressionAttributeValues[':updatedAt'] = new Date().toISOString();
        
        // If status is being changed to completed, set completedDate
        if (data.status === 'completed' && !data.completedDate) {
            updateExpressions.push('#completedDate = :completedDate');
            expressionAttributeNames['#completedDate'] = 'completedDate';
            expressionAttributeValues[':completedDate'] = new Date().toISOString();
        }
        
        const params = {
            TableName: WORK_ORDERS_TABLE,
            Key: { id },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        };
        
        const result = await dynamodb.update(params).promise();
        
        return createResponse(200, {
            success: true,
            data: result.Attributes
        });
        
    } catch (error) {
        console.error('Error updating work order:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

// GET /maintenance/stats
exports.getMaintenanceStats = async (event) => {
    try {
        const result = await dynamodb.scan({
            TableName: WORK_ORDERS_TABLE
        }).promise();
        
        const workOrders = result.Items;
        const now = new Date();
        
        const stats = {
            total: workOrders.length,
            pending: 0,
            inProgress: 0,
            completed: 0,
            overdue: 0
        };
        
        workOrders.forEach(order => {
            switch (order.status) {
                case 'pending':
                    stats.pending++;
                    break;
                case 'in_progress':
                    stats.inProgress++;
                    break;
                case 'completed':
                    stats.completed++;
                    break;
            }
            
            // Check if overdue
            if (order.scheduledDate && 
                new Date(order.scheduledDate) < now && 
                order.status !== 'completed') {
                stats.overdue++;
            }
        });
        
        return createResponse(200, {
            success: true,
            data: stats
        });
        
    } catch (error) {
        console.error('Error getting maintenance stats:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};
