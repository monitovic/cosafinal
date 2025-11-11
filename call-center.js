const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const connect = new AWS.Connect();
const sns = new AWS.SNS();

// Tablas DynamoDB
const TICKETS_TABLE = process.env.TICKETS_TABLE;
const CALL_LOGS_TABLE = process.env.CALL_LOGS_TABLE;
const AGENTS_TABLE = process.env.AGENTS_TABLE;

exports.createTicket = async (event) => {
    try {
        const { residentId, subject, description, priority, category } = JSON.parse(event.body);
        
        const ticket = {
            id: uuidv4(),
            residentId,
            subject,
            description,
            priority: priority || 'medium',
            category: category || 'general',
            status: 'open',
            assignedAgent: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            responses: [],
            escalationLevel: 0
        };

        await dynamodb.put({
            TableName: TICKETS_TABLE,
            Item: ticket
        }).promise();

        // Asignar automáticamente a agente disponible
        const assignedAgent = await assignToAvailableAgent(ticket.id, category);
        
        // Enviar notificación
        await sendTicketNotification(ticket, assignedAgent);

        return {
            statusCode: 201,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                data: { ...ticket, assignedAgent },
                message: 'Ticket creado exitosamente'
            })
        };

    } catch (error) {
        console.error('Error creating ticket:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                error: 'Error interno del servidor'
            })
        };
    }
};

exports.getTickets = async (event) => {
    try {
        const { queryStringParameters } = event;
        const {
            status,
            priority,
            category,
            assignedAgent,
            residentId,
            page = 1,
            limit = 50
        } = queryStringParameters || {};

        let filterExpression = '';
        let expressionAttributeValues = {};
        let expressionAttributeNames = {};

        // Construir filtros dinámicos
        const filters = [];
        
        if (status) {
            filters.push('#status = :status');
            expressionAttributeNames['#status'] = 'status';
            expressionAttributeValues[':status'] = status;
        }
        
        if (priority) {
            filters.push('priority = :priority');
            expressionAttributeValues[':priority'] = priority;
        }
        
        if (category) {
            filters.push('category = :category');
            expressionAttributeValues[':category'] = category;
        }
        
        if (assignedAgent) {
            filters.push('assignedAgent = :assignedAgent');
            expressionAttributeValues[':assignedAgent'] = assignedAgent;
        }
        
        if (residentId) {
            filters.push('residentId = :residentId');
            expressionAttributeValues[':residentId'] = residentId;
        }

        if (filters.length > 0) {
            filterExpression = filters.join(' AND ');
        }

        const params = {
            TableName: TICKETS_TABLE,
            ...(filterExpression && { FilterExpression: filterExpression }),
            ...(Object.keys(expressionAttributeValues).length > 0 && { ExpressionAttributeValues: expressionAttributeValues }),
            ...(Object.keys(expressionAttributeNames).length > 0 && { ExpressionAttributeNames: expressionAttributeNames })
        };

        const result = await dynamodb.scan(params).promise();
        
        // Paginación manual
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedItems = result.Items.slice(startIndex, endIndex);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                data: {
                    tickets: paginatedItems,
                    pagination: {
                        currentPage: parseInt(page),
                        totalItems: result.Items.length,
                        totalPages: Math.ceil(result.Items.length / limit),
                        itemsPerPage: parseInt(limit)
                    }
                }
            })
        };

    } catch (error) {
        console.error('Error getting tickets:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                error: 'Error interno del servidor'
            })
        };
    }
};

exports.updateTicket = async (event) => {
    try {
        const { ticketId } = event.pathParameters;
        const updates = JSON.parse(event.body);
        
        // Obtener ticket actual
        const currentTicket = await dynamodb.get({
            TableName: TICKETS_TABLE,
            Key: { id: ticketId }
        }).promise();

        if (!currentTicket.Item) {
            return {
                statusCode: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Ticket no encontrado'
                })
            };
        }

        // Preparar actualizaciones
        let updateExpression = 'SET updatedAt = :updatedAt';
        let expressionAttributeValues = {
            ':updatedAt': new Date().toISOString()
        };

        // Campos actualizables
        const allowedUpdates = ['status', 'priority', 'assignedAgent', 'category'];
        
        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                updateExpression += `, ${field} = :${field}`;
                expressionAttributeValues[`:${field}`] = updates[field];
            }
        });

        // Agregar respuesta si se proporciona
        if (updates.response) {
            const response = {
                id: uuidv4(),
                message: updates.response,
                agentId: updates.agentId,
                timestamp: new Date().toISOString(),
                type: updates.responseType || 'agent_response'
            };

            updateExpression += ', responses = list_append(if_not_exists(responses, :empty_list), :response)';
            expressionAttributeValues[':response'] = [response];
            expressionAttributeValues[':empty_list'] = [];
        }

        // Actualizar ticket
        const result = await dynamodb.update({
            TableName: TICKETS_TABLE,
            Key: { id: ticketId },
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        }).promise();

        // Enviar notificación si cambió el status
        if (updates.status && updates.status !== currentTicket.Item.status) {
            await sendStatusChangeNotification(result.Attributes);
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                data: result.Attributes,
                message: 'Ticket actualizado exitosamente'
            })
        };

    } catch (error) {
        console.error('Error updating ticket:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                error: 'Error interno del servidor'
            })
        };
    }
};

exports.initiateCall = async (event) => {
    try {
        const { residentId, phoneNumber, agentId } = JSON.parse(event.body);
        
        // Iniciar llamada usando Amazon Connect
        const callParams = {
            ContactFlowId: process.env.CONTACT_FLOW_ID,
            InstanceId: process.env.CONNECT_INSTANCE_ID,
            DestinationPhoneNumber: phoneNumber,
            SourcePhoneNumber: process.env.CONNECT_PHONE_NUMBER,
            Attributes: {
                residentId,
                agentId,
                callType: 'outbound'
            }
        };

        const callResult = await connect.startOutboundVoiceContact(callParams).promise();
        
        // Registrar llamada en logs
        const callLog = {
            id: uuidv4(),
            contactId: callResult.ContactId,
            residentId,
            agentId,
            phoneNumber,
            direction: 'outbound',
            status: 'initiated',
            startTime: new Date().toISOString(),
            duration: null,
            recording: null,
            notes: null
        };

        await dynamodb.put({
            TableName: CALL_LOGS_TABLE,
            Item: callLog
        }).promise();

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                data: {
                    contactId: callResult.ContactId,
                    callLog
                },
                message: 'Llamada iniciada exitosamente'
            })
        };

    } catch (error) {
        console.error('Error initiating call:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                error: 'Error al iniciar llamada'
            })
        };
    }
};

exports.getCallLogs = async (event) => {
    try {
        const { queryStringParameters } = event;
        const {
            agentId,
            residentId,
            dateFrom,
            dateTo,
            status,
            direction
        } = queryStringParameters || {};

        let filterExpression = '';
        let expressionAttributeValues = {};

        const filters = [];
        
        if (agentId) {
            filters.push('agentId = :agentId');
            expressionAttributeValues[':agentId'] = agentId;
        }
        
        if (residentId) {
            filters.push('residentId = :residentId');
            expressionAttributeValues[':residentId'] = residentId;
        }
        
        if (status) {
            filters.push('#status = :status');
            expressionAttributeValues[':status'] = status;
        }
        
        if (direction) {
            filters.push('direction = :direction');
            expressionAttributeValues[':direction'] = direction;
        }

        if (filters.length > 0) {
            filterExpression = filters.join(' AND ');
        }

        const params = {
            TableName: CALL_LOGS_TABLE,
            ...(filterExpression && { FilterExpression: filterExpression }),
            ...(Object.keys(expressionAttributeValues).length > 0 && { ExpressionAttributeValues: expressionAttributeValues })
        };

        const result = await dynamodb.scan(params).promise();

        // Filtrar por fechas si se proporcionan
        let filteredItems = result.Items;
        
        if (dateFrom || dateTo) {
            filteredItems = result.Items.filter(item => {
                const itemDate = new Date(item.startTime);
                if (dateFrom && itemDate < new Date(dateFrom)) return false;
                if (dateTo && itemDate > new Date(dateTo)) return false;
                return true;
            });
        }

        // Calcular estadísticas
        const stats = calculateCallStats(filteredItems);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                data: {
                    callLogs: filteredItems,
                    statistics: stats
                }
            })
        };

    } catch (error) {
        console.error('Error getting call logs:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                error: 'Error interno del servidor'
            })
        };
    }
};

// Funciones auxiliares
async function assignToAvailableAgent(ticketId, category) {
    try {
        // Buscar agentes disponibles por categoría
        const agentsResult = await dynamodb.scan({
            TableName: AGENTS_TABLE,
            FilterExpression: '#status = :status AND contains(specialties, :category)',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':status': 'available',
                ':category': category
            }
        }).promise();

        if (agentsResult.Items.length === 0) {
            // Si no hay agentes especializados, buscar cualquier agente disponible
            const anyAgentResult = await dynamodb.scan({
                TableName: AGENTS_TABLE,
                FilterExpression: '#status = :status',
                ExpressionAttributeNames: {
                    '#status': 'status'
                },
                ExpressionAttributeValues: {
                    ':status': 'available'
                }
            }).promise();

            if (anyAgentResult.Items.length === 0) {
                return null; // No hay agentes disponibles
            }

            agentsResult.Items = anyAgentResult.Items;
        }

        // Seleccionar agente con menor carga de trabajo
        const selectedAgent = agentsResult.Items.reduce((prev, current) => {
            return (prev.currentTickets < current.currentTickets) ? prev : current;
        });

        // Asignar ticket al agente
        await dynamodb.update({
            TableName: TICKETS_TABLE,
            Key: { id: ticketId },
            UpdateExpression: 'SET assignedAgent = :agentId',
            ExpressionAttributeValues: {
                ':agentId': selectedAgent.id
            }
        }).promise();

        // Incrementar contador de tickets del agente
        await dynamodb.update({
            TableName: AGENTS_TABLE,
            Key: { id: selectedAgent.id },
            UpdateExpression: 'SET currentTickets = currentTickets + :inc',
            ExpressionAttributeValues: {
                ':inc': 1
            }
        }).promise();

        return selectedAgent;

    } catch (error) {
        console.error('Error assigning agent:', error);
        return null;
    }
}

async function sendTicketNotification(ticket, agent) {
    try {
        const message = {
            ticketId: ticket.id,
            subject: ticket.subject,
            priority: ticket.priority,
            assignedAgent: agent ? agent.name : 'Sin asignar',
            createdAt: ticket.createdAt
        };

        await sns.publish({
            TopicArn: process.env.TICKET_NOTIFICATIONS_TOPIC,
            Message: JSON.stringify(message),
            Subject: `Nuevo Ticket: ${ticket.subject}`
        }).promise();

    } catch (error) {
        console.error('Error sending notification:', error);
    }
}

async function sendStatusChangeNotification(ticket) {
    try {
        const message = {
            ticketId: ticket.id,
            subject: ticket.subject,
            newStatus: ticket.status,
            updatedAt: ticket.updatedAt
        };

        await sns.publish({
            TopicArn: process.env.TICKET_NOTIFICATIONS_TOPIC,
            Message: JSON.stringify(message),
            Subject: `Ticket Actualizado: ${ticket.subject}`
        }).promise();

    } catch (error) {
        console.error('Error sending status notification:', error);
    }
}

function calculateCallStats(callLogs) {
    const stats = {
        totalCalls: callLogs.length,
        inboundCalls: 0,
        outboundCalls: 0,
        completedCalls: 0,
        averageDuration: 0,
        totalDuration: 0
    };

    let totalDurationMinutes = 0;
    let completedCallsCount = 0;

    callLogs.forEach(call => {
        if (call.direction === 'inbound') stats.inboundCalls++;
        if (call.direction === 'outbound') stats.outboundCalls++;
        if (call.status === 'completed') {
            stats.completedCalls++;
            if (call.duration) {
                totalDurationMinutes += call.duration;
                completedCallsCount++;
            }
        }
    });

    stats.totalDuration = totalDurationMinutes;
    stats.averageDuration = completedCallsCount > 0 ? totalDurationMinutes / completedCallsCount : 0;

    return stats;
}
