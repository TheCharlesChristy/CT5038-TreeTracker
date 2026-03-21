import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppInput } from '@/components/base/AppInput';
import { AppButton } from '@/components/base/AppButton';
import { NavigationButton } from '@/components/base/NavigationButton';
import { Theme } from '@/styles/theme';
import { API_ORIGIN } from '@/config/api';

type EndpointsResponse = {
  flatEndpoints?: string[];
};

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

type LogEntry = {
  id: number;
  timestamp: string;
  level: LogLevel;
  message: string;
  detail?: string;
};

type FieldType = 'text' | 'number' | 'boolean' | 'datetime' | 'textarea';

type FormField = {
  id: string;
  label: string;
  type: FieldType;
  argIndex: number;
  path: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | boolean;
};

type EndpointSchema = {
  description: string;
  fields: FormField[];
};

const DEFAULT_BASE_URL = API_ORIGIN;

const field = (
  id: string,
  label: string,
  type: FieldType,
  argIndex: number,
  path: string,
  options: Partial<Pick<FormField, 'required' | 'placeholder' | 'defaultValue'>> = {}
): FormField => ({
  id,
  label,
  type,
  argIndex,
  path,
  ...options,
});

const listParamsFields = (argIndex: number, includeOrder = false): FormField[] => {
  const listFields: FormField[] = [
    field(`limit-${argIndex}`, 'Limit', 'number', argIndex, 'limit', { placeholder: '50', defaultValue: '50' }),
    field(`offset-${argIndex}`, 'Offset', 'number', argIndex, 'offset', { placeholder: '0', defaultValue: '0' }),
  ];

  if (includeOrder) {
    listFields.push(field(`order-${argIndex}`, 'Order (asc/desc)', 'text', argIndex, 'order', { defaultValue: 'desc' }));
  }

  return listFields;
};

const EXPLICIT_SCHEMAS: Record<string, EndpointSchema> = {
  'debug.listTables': {
    description: 'List all known tables in the current database.',
    fields: [],
  },
  'debug.countRows': {
    description: 'Count rows in a selected table.',
    fields: [field('tableName', 'Table Name', 'text', 0, '', { required: true, placeholder: 'users' })],
  },
  'debug.listRows': {
    description: 'List rows in a table with paging and ordering.',
    fields: [
      field('tableName', 'Table Name', 'text', 0, '', { required: true, placeholder: 'users' }),
      ...listParamsFields(1, true),
    ],
  },
  'debug.previewAll': {
    description: 'Preview all tables with row counts and sample rows.',
    fields: listParamsFields(0, true),
  },
  'users.create': {
    description: 'Create a user record.',
    fields: [
      field('username', 'Username', 'text', 0, 'username', { required: true }),
      field('email', 'Email', 'text', 0, 'email'),
      field('phone', 'Phone', 'text', 0, 'phone'),
    ],
  },
  'users.updateById': {
    description: 'Update user fields by id.',
    fields: [
      field('id', 'User ID', 'number', 0, '', { required: true }),
      field('username', 'Username', 'text', 1, 'username'),
      field('email', 'Email', 'text', 1, 'email'),
      field('phone', 'Phone', 'text', 1, 'phone'),
    ],
  },
  'users.getByUsername': {
    description: 'Get a user by username.',
    fields: [field('username', 'Username', 'text', 0, '', { required: true })],
  },
  'users.existsByUsername': {
    description: 'Check whether a username exists.',
    fields: [field('username', 'Username', 'text', 0, '', { required: true })],
  },
  'userPasswords.setForUser': {
    description: 'Set password hash for a user.',
    fields: [
      field('userId', 'User ID', 'number', 0, '', { required: true }),
      field('passwordHash', 'Password Hash', 'text', 1, '', { required: true }),
    ],
  },
  'userSessions.create': {
    description: 'Create a user session.',
    fields: [
      field('userId', 'User ID', 'number', 0, 'userId', { required: true }),
      field('sessionToken', 'Session Token (64 hex)', 'text', 0, 'sessionToken', { required: true }),
      field('expiresAt', 'Expires At (ISO date)', 'datetime', 0, 'expiresAt', { required: true }),
    ],
  },
  'userSessions.extendByToken': {
    description: 'Extend an existing session by token.',
    fields: [
      field('sessionToken', 'Session Token (64 hex)', 'text', 0, '', { required: true }),
      field('newExpiresAt', 'New Expires At (ISO date)', 'datetime', 1, '', { required: true }),
    ],
  },
  'userSessions.getByToken': {
    description: 'Get session by token.',
    fields: [field('sessionToken', 'Session Token (64 hex)', 'text', 0, '', { required: true })],
  },
  'userSessions.deleteByToken': {
    description: 'Delete session by token.',
    fields: [field('sessionToken', 'Session Token (64 hex)', 'text', 0, '', { required: true })],
  },
  'trees.create': {
    description: 'Create a tree with coordinates.',
    fields: [
      field('latitude', 'Latitude', 'number', 0, 'latitude', { required: true }),
      field('longitude', 'Longitude', 'number', 0, 'longitude', { required: true }),
    ],
  },
  'trees.updateById': {
    description: 'Update tree coordinates by id.',
    fields: [
      field('id', 'Tree ID', 'number', 0, '', { required: true }),
      field('latitude', 'Latitude', 'number', 1, 'latitude'),
      field('longitude', 'Longitude', 'number', 1, 'longitude'),
    ],
  },
  'trees.findByBoundingBox': {
    description: 'Find trees in a bounding box.',
    fields: [
      field('latMin', 'Lat Min', 'number', 0, 'latMin', { required: true }),
      field('latMax', 'Lat Max', 'number', 0, 'latMax', { required: true }),
      field('lonMin', 'Lon Min', 'number', 0, 'lonMin', { required: true }),
      field('lonMax', 'Lon Max', 'number', 0, 'lonMax', { required: true }),
      ...listParamsFields(0),
    ],
  },
  'trees.findNear': {
    description: 'Find trees near a coordinate and radius.',
    fields: [
      field('latitude', 'Latitude', 'number', 0, 'latitude', { required: true }),
      field('longitude', 'Longitude', 'number', 0, 'longitude', { required: true }),
      field('radiusMeters', 'Radius Meters', 'number', 0, 'radiusMeters', { required: true }),
      field('limit', 'Limit', 'number', 0, 'limit', { defaultValue: '50' }),
    ],
  },
  'treeCreationData.create': {
    description: 'Create tree creation metadata.',
    fields: [
      field('treeId', 'Tree ID', 'number', 0, 'treeId', { required: true }),
      field('creatorUserId', 'Creator User ID', 'number', 0, 'creatorUserId'),
      field('createdAt', 'Created At', 'datetime', 0, 'createdAt'),
    ],
  },
  'treeCreationData.updateById': {
    description: 'Update tree creation metadata by row id.',
    fields: [
      field('id', 'Row ID', 'number', 0, '', { required: true }),
      field('creatorUserId', 'Creator User ID', 'number', 1, 'creatorUserId'),
      field('createdAt', 'Created At', 'datetime', 1, 'createdAt'),
    ],
  },
  'treeData.create': {
    description: 'Create tree data metrics.',
    fields: [
      field('treeId', 'Tree ID', 'number', 0, 'treeId', { required: true }),
      field('treeHeight', 'Tree Height', 'number', 0, 'treeHeight'),
      field('trunkDiameter', 'Trunk Diameter', 'number', 0, 'trunkDiameter'),
      field('leafArea', 'Leaf Area', 'number', 0, 'leafArea'),
      field('carbonDioxideStored', 'CO2 Stored', 'number', 0, 'carbonDioxideStored'),
      field('carbonDioxideRemoved', 'CO2 Removed', 'number', 0, 'carbonDioxideRemoved'),
      field('waterIntercepted', 'Water Intercepted', 'number', 0, 'waterIntercepted'),
      field('airQualityImprovement', 'Air Quality Improvement', 'number', 0, 'airQualityImprovement'),
      field('avoidedRunoff', 'Avoided Runoff', 'number', 0, 'avoidedRunoff'),
      field('evapotranspiration', 'Evapotranspiration', 'number', 0, 'evapotranspiration'),
      field('trunkCircumference', 'Trunk Circumference', 'number', 0, 'trunkCircumference'),
    ],
  },
  'treeData.updateByTreeId': {
    description: 'Update tree data metrics by tree id.',
    fields: [
      field('treeId', 'Tree ID', 'number', 0, '', { required: true }),
      field('treeHeight', 'Tree Height', 'number', 1, 'treeHeight'),
      field('trunkDiameter', 'Trunk Diameter', 'number', 1, 'trunkDiameter'),
      field('leafArea', 'Leaf Area', 'number', 1, 'leafArea'),
      field('carbonDioxideStored', 'CO2 Stored', 'number', 1, 'carbonDioxideStored'),
      field('carbonDioxideRemoved', 'CO2 Removed', 'number', 1, 'carbonDioxideRemoved'),
      field('waterIntercepted', 'Water Intercepted', 'number', 1, 'waterIntercepted'),
      field('airQualityImprovement', 'Air Quality Improvement', 'number', 1, 'airQualityImprovement'),
      field('avoidedRunoff', 'Avoided Runoff', 'number', 1, 'avoidedRunoff'),
      field('evapotranspiration', 'Evapotranspiration', 'number', 1, 'evapotranspiration'),
      field('trunkCircumference', 'Trunk Circumference', 'number', 1, 'trunkCircumference'),
    ],
  },
  'guardians.add': {
    description: 'Attach a guardian to a tree.',
    fields: [
      field('userId', 'User ID', 'number', 0, 'userId', { required: true }),
      field('treeId', 'Tree ID', 'number', 0, 'treeId', { required: true }),
    ],
  },
  'guardians.remove': {
    description: 'Remove a guardian/tree relation.',
    fields: [
      field('userId', 'User ID', 'number', 0, 'userId', { required: true }),
      field('treeId', 'Tree ID', 'number', 0, 'treeId', { required: true }),
    ],
  },
  'guardians.exists': {
    description: 'Check whether a guardian/tree relation exists.',
    fields: [
      field('userId', 'User ID', 'number', 0, 'userId', { required: true }),
      field('treeId', 'Tree ID', 'number', 0, 'treeId', { required: true }),
    ],
  },
  'photos.create': {
    description: 'Create a photo row.',
    fields: [
      field('imageUrl', 'Image URL', 'text', 0, 'imageUrl', { required: true }),
      field('mimeType', 'MIME Type', 'text', 0, 'mimeType'),
      field('byteSize', 'Byte Size', 'number', 0, 'byteSize'),
      field('sha256', 'SHA-256', 'text', 0, 'sha256'),
      field('createdAt', 'Created At', 'datetime', 0, 'createdAt'),
    ],
  },
  'photos.updateById': {
    description: 'Update photo row by id.',
    fields: [
      field('id', 'Photo ID', 'number', 0, '', { required: true }),
      field('imageUrl', 'Image URL', 'text', 1, 'imageUrl'),
      field('mimeType', 'MIME Type', 'text', 1, 'mimeType'),
      field('byteSize', 'Byte Size', 'number', 1, 'byteSize'),
      field('sha256', 'SHA-256', 'text', 1, 'sha256'),
    ],
  },
  'photos.getBySha256': {
    description: 'Get photo by SHA-256 hash.',
    fields: [field('sha256', 'SHA-256', 'text', 0, '', { required: true })],
  },
  'treePhotos.add': {
    description: 'Attach photo to tree.',
    fields: [
      field('treeId', 'Tree ID', 'number', 0, 'treeId', { required: true }),
      field('photoId', 'Photo ID', 'number', 0, 'photoId', { required: true }),
    ],
  },
  'treePhotos.remove': {
    description: 'Remove photo from tree.',
    fields: [
      field('treeId', 'Tree ID', 'number', 0, 'treeId', { required: true }),
      field('photoId', 'Photo ID', 'number', 0, 'photoId', { required: true }),
    ],
  },
  'treePhotos.exists': {
    description: 'Check tree/photo relation.',
    fields: [
      field('treeId', 'Tree ID', 'number', 0, 'treeId', { required: true }),
      field('photoId', 'Photo ID', 'number', 0, 'photoId', { required: true }),
    ],
  },
  'comments.create': {
    description: 'Create a comment base row.',
    fields: [
      field('userId', 'User ID', 'number', 0, 'userId'),
      field('createdAt', 'Created At', 'datetime', 0, 'createdAt'),
    ],
  },
  'comments.updateUserById': {
    description: 'Set or clear comment user.',
    fields: [
      field('id', 'Comment ID', 'number', 0, '', { required: true }),
      field('userIdOrNull', 'User ID (leave empty for null)', 'number', 1, ''),
    ],
  },
  'commentPhotos.add': {
    description: 'Attach photo to comment.',
    fields: [
      field('commentId', 'Comment ID', 'number', 0, 'commentId', { required: true }),
      field('photoId', 'Photo ID', 'number', 0, 'photoId', { required: true }),
    ],
  },
  'commentPhotos.remove': {
    description: 'Remove photo from comment.',
    fields: [
      field('commentId', 'Comment ID', 'number', 0, 'commentId', { required: true }),
      field('photoId', 'Photo ID', 'number', 0, 'photoId', { required: true }),
    ],
  },
  'commentPhotos.exists': {
    description: 'Check comment/photo relation.',
    fields: [
      field('commentId', 'Comment ID', 'number', 0, 'commentId', { required: true }),
      field('photoId', 'Photo ID', 'number', 0, 'photoId', { required: true }),
    ],
  },
  'commentsTree.create': {
    description: 'Create tree comment content row.',
    fields: [
      field('commentId', 'Comment ID', 'number', 0, 'commentId', { required: true }),
      field('treeId', 'Tree ID', 'number', 0, 'treeId', { required: true }),
      field('content', 'Content', 'textarea', 0, 'content', { required: true }),
      field('createdAt', 'Created At', 'datetime', 0, 'createdAt'),
    ],
  },
  'commentsTree.get': {
    description: 'Get tree comment content row by keys.',
    fields: [
      field('commentId', 'Comment ID', 'number', 0, 'commentId', { required: true }),
      field('treeId', 'Tree ID', 'number', 0, 'treeId', { required: true }),
    ],
  },
  'commentsTree.updateContent': {
    description: 'Update content of a tree comment row.',
    fields: [
      field('commentId', 'Comment ID', 'number', 0, 'commentId', { required: true }),
      field('treeId', 'Tree ID', 'number', 0, 'treeId', { required: true }),
      field('content', 'Content', 'textarea', 0, 'content', { required: true }),
    ],
  },
  'commentsTree.delete': {
    description: 'Delete tree comment content row.',
    fields: [
      field('commentId', 'Comment ID', 'number', 0, 'commentId', { required: true }),
      field('treeId', 'Tree ID', 'number', 0, 'treeId', { required: true }),
    ],
  },
  'commentReplies.create': {
    description: 'Create a reply row.',
    fields: [
      field('commentId', 'Comment ID', 'number', 0, 'commentId', { required: true }),
      field('parentCommentId', 'Parent Comment ID', 'number', 0, 'parentCommentId', { required: true }),
      field('content', 'Content', 'textarea', 0, 'content', { required: true }),
      field('createdAt', 'Created At', 'datetime', 0, 'createdAt'),
    ],
  },
  'commentReplies.get': {
    description: 'Get a reply row by composite key.',
    fields: [
      field('commentId', 'Comment ID', 'number', 0, 'commentId', { required: true }),
      field('parentCommentId', 'Parent Comment ID', 'number', 0, 'parentCommentId', { required: true }),
    ],
  },
  'commentReplies.updateContent': {
    description: 'Update reply content.',
    fields: [
      field('commentId', 'Comment ID', 'number', 0, 'commentId', { required: true }),
      field('parentCommentId', 'Parent Comment ID', 'number', 0, 'parentCommentId', { required: true }),
      field('content', 'Content', 'textarea', 0, 'content', { required: true }),
    ],
  },
  'commentReplies.delete': {
    description: 'Delete reply by composite key.',
    fields: [
      field('commentId', 'Comment ID', 'number', 0, 'commentId', { required: true }),
      field('parentCommentId', 'Parent Comment ID', 'number', 0, 'parentCommentId', { required: true }),
    ],
  },
  'wildlifeObservations.create': {
    description: 'Create wildlife observation.',
    fields: [
      field('commentId', 'Comment ID', 'number', 0, 'commentId', { required: true }),
      field('treeId', 'Tree ID', 'number', 0, 'treeId', { required: true }),
      field('wildlife', 'Wildlife', 'text', 0, 'wildlife', { required: true }),
      field('wildlifeFound', 'Wildlife Found', 'boolean', 0, 'wildlifeFound', { defaultValue: true }),
      field('observationNotes', 'Observation Notes', 'textarea', 0, 'observationNotes'),
    ],
  },
  'wildlifeObservations.updateByCommentId': {
    description: 'Update wildlife observation by comment id.',
    fields: [
      field('commentId', 'Comment ID', 'number', 0, '', { required: true }),
      field('wildlife', 'Wildlife', 'text', 1, 'wildlife'),
      field('wildlifeFound', 'Wildlife Found', 'boolean', 1, 'wildlifeFound'),
      field('observationNotes', 'Observation Notes', 'textarea', 1, 'observationNotes'),
    ],
  },
  'diseaseObservations.create': {
    description: 'Create disease observation.',
    fields: [
      field('commentId', 'Comment ID', 'number', 0, 'commentId', { required: true }),
      field('treeId', 'Tree ID', 'number', 0, 'treeId', { required: true }),
      field('disease', 'Disease', 'text', 0, 'disease', { required: true }),
      field('evidence', 'Evidence', 'textarea', 0, 'evidence'),
    ],
  },
  'diseaseObservations.updateByCommentId': {
    description: 'Update disease observation by comment id.',
    fields: [
      field('commentId', 'Comment ID', 'number', 0, '', { required: true }),
      field('disease', 'Disease', 'text', 1, 'disease'),
      field('evidence', 'Evidence', 'textarea', 1, 'evidence'),
    ],
  },
  'seenObservations.create': {
    description: 'Create seen observation.',
    fields: [
      field('commentId', 'Comment ID', 'number', 0, 'commentId', { required: true }),
      field('treeId', 'Tree ID', 'number', 0, 'treeId', { required: true }),
      field('observationNotes', 'Observation Notes', 'textarea', 0, 'observationNotes'),
    ],
  },
  'seenObservations.updateByCommentId': {
    description: 'Update seen observation by comment id.',
    fields: [
      field('commentId', 'Comment ID', 'number', 0, '', { required: true }),
      field('observationNotes', 'Observation Notes', 'textarea', 1, 'observationNotes'),
    ],
  },
  'workflows.auth.registerUser': {
    description: 'Register a user and store password hash.',
    fields: [
      field('username', 'Username', 'text', 0, 'username', { required: true }),
      field('passwordHash', 'Password Hash', 'text', 0, 'passwordHash', { required: true }),
      field('email', 'Email', 'text', 0, 'email'),
      field('phone', 'Phone', 'text', 0, 'phone'),
    ],
  },
  'workflows.auth.createSession': {
    description: 'Create session via workflow.',
    fields: EXPLICIT_SCHEMAS_PLACEHOLDER(),
  },
  'workflows.auth.validateSession': {
    description: 'Validate session token.',
    fields: [
      field('sessionToken', 'Session Token (64 hex)', 'text', 0, 'sessionToken', { required: true }),
      field('now', 'Now (ISO date)', 'datetime', 0, 'now'),
    ],
  },
  'workflows.auth.logout': {
    description: 'Logout a session token.',
    fields: [field('sessionToken', 'Session Token (64 hex)', 'text', 0, 'sessionToken', { required: true })],
  },
  'workflows.trees.createTreeWithMeta': {
    description: 'Create tree plus creation metadata in one transaction.',
    fields: [
      field('latitude', 'Latitude', 'number', 0, 'latitude', { required: true }),
      field('longitude', 'Longitude', 'number', 0, 'longitude', { required: true }),
      field('creatorUserId', 'Creator User ID', 'number', 0, 'creatorUserId'),
    ],
  },
  'workflows.trees.setTreeData': {
    description: 'Create or update tree data via workflow.',
    fields: [
      field('treeId', 'Tree ID', 'number', 0, 'treeId', { required: true }),
      field('treeHeight', 'Tree Height', 'number', 0, 'treeDataFields.treeHeight'),
      field('trunkDiameter', 'Trunk Diameter', 'number', 0, 'treeDataFields.trunkDiameter'),
      field('leafArea', 'Leaf Area', 'number', 0, 'treeDataFields.leafArea'),
      field('carbonDioxideStored', 'CO2 Stored', 'number', 0, 'treeDataFields.carbonDioxideStored'),
      field('waterIntercepted', 'Water Intercepted', 'number', 0, 'treeDataFields.waterIntercepted'),
    ],
  },
  'workflows.trees.getTreeDetails': {
    description: 'Get full tree details by tree id.',
    fields: [field('treeId', 'Tree ID', 'number', 0, '', { required: true })],
  },
  'workflows.trees.getTreeFeed': {
    description: 'Get tree feed with optional paging.',
    fields: [
      field('treeId', 'Tree ID', 'number', 0, '', { required: true }),
      ...listParamsFields(1),
    ],
  },
  'workflows.photos.addPhotoAndAttachToTree': {
    description: 'Create/reuse photo and attach it to a tree.',
    fields: [
      field('treeId', 'Tree ID', 'number', 0, 'treeId', { required: true }),
      field('imageUrl', 'Photo URL', 'text', 0, 'photo.imageUrl', { required: true }),
      field('mimeType', 'Photo MIME Type', 'text', 0, 'photo.mimeType'),
      field('byteSize', 'Photo Byte Size', 'number', 0, 'photo.byteSize'),
      field('sha256', 'Photo SHA-256', 'text', 0, 'photo.sha256'),
    ],
  },
  'workflows.photos.addPhotoAndAttachToComment': {
    description: 'Create/reuse photo and attach it to a comment.',
    fields: [
      field('commentId', 'Comment ID', 'number', 0, 'commentId', { required: true }),
      field('imageUrl', 'Photo URL', 'text', 0, 'photo.imageUrl', { required: true }),
      field('mimeType', 'Photo MIME Type', 'text', 0, 'photo.mimeType'),
      field('byteSize', 'Photo Byte Size', 'number', 0, 'photo.byteSize'),
      field('sha256', 'Photo SHA-256', 'text', 0, 'photo.sha256'),
    ],
  },
  'workflows.comments.addTreeComment': {
    description: 'Create a tree comment via workflow.',
    fields: [
      field('treeId', 'Tree ID', 'number', 0, 'treeId', { required: true }),
      field('userId', 'User ID', 'number', 0, 'userId'),
      field('content', 'Content', 'textarea', 0, 'content', { required: true }),
    ],
  },
  'workflows.comments.replyToComment': {
    description: 'Reply to an existing comment via workflow.',
    fields: [
      field('parentCommentId', 'Parent Comment ID', 'number', 0, 'parentCommentId', { required: true }),
      field('userId', 'User ID', 'number', 0, 'userId'),
      field('content', 'Content', 'textarea', 0, 'content', { required: true }),
    ],
  },
  'workflows.observations.addWildlifeObservation': {
    description: 'Create wildlife observation workflow event.',
    fields: [
      field('treeId', 'Tree ID', 'number', 0, 'treeId', { required: true }),
      field('userId', 'User ID', 'number', 0, 'userId'),
      field('wildlife', 'Wildlife', 'text', 0, 'wildlife', { required: true }),
      field('wildlifeFound', 'Wildlife Found', 'boolean', 0, 'wildlifeFound', { defaultValue: true }),
      field('observationNotes', 'Observation Notes', 'textarea', 0, 'observationNotes'),
    ],
  },
  'workflows.observations.addDiseaseObservation': {
    description: 'Create disease observation workflow event.',
    fields: [
      field('treeId', 'Tree ID', 'number', 0, 'treeId', { required: true }),
      field('userId', 'User ID', 'number', 0, 'userId'),
      field('disease', 'Disease', 'text', 0, 'disease', { required: true }),
      field('evidence', 'Evidence', 'textarea', 0, 'evidence'),
    ],
  },
  'workflows.observations.addSeenObservation': {
    description: 'Create seen observation workflow event.',
    fields: [
      field('treeId', 'Tree ID', 'number', 0, 'treeId', { required: true }),
      field('userId', 'User ID', 'number', 0, 'userId'),
      field('observationNotes', 'Observation Notes', 'textarea', 0, 'observationNotes'),
    ],
  },
  'workflows.users.getUserProfile': {
    description: 'Get user profile by user id.',
    fields: [field('userId', 'User ID', 'number', 0, '', { required: true })],
  },
};

// Helper to avoid circular reference in object literal for workflows.auth.createSession.
function EXPLICIT_SCHEMAS_PLACEHOLDER(): FormField[] {
  return [
    field('userId', 'User ID', 'number', 0, 'userId', { required: true }),
    field('sessionToken', 'Session Token (64 hex)', 'text', 0, 'sessionToken', { required: true }),
    field('expiresAt', 'Expires At (ISO date)', 'datetime', 0, 'expiresAt', { required: true }),
  ];
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/$/, '');
}

function setNestedValue(target: Record<string, unknown>, path: string, value: unknown) {
  if (!path) {
    return;
  }
  const segments = path.split('.').filter(Boolean);
  if (segments.length === 0) {
    return;
  }

  let cursor: Record<string, unknown> = target;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const key = segments[index];
    const existing = cursor[key];
    if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }

  cursor[segments[segments.length - 1]] = value;
}

function createHeuristicSchema(endpoint: string): EndpointSchema {
  const parts = endpoint.split('.');
  const method = parts[parts.length - 1] || endpoint;
  const description = `Auto-generated form schema for ${endpoint}.`;

  if (method === 'list') {
    return { description, fields: listParamsFields(0) };
  }

  if (method.startsWith('listBy')) {
    const idLabel = method.replace('listBy', '').replace(/([A-Z])/g, ' $1').trim();
    return {
      description,
      fields: [
        field('primaryId', `${idLabel} (ID)`, 'number', 0, '', { required: true }),
        ...listParamsFields(1),
      ],
    };
  }

  if (method.startsWith('deleteBy') || method.startsWith('getBy') || method.startsWith('existsBy') || method.startsWith('countBy')) {
    return {
      description,
      fields: [field('id', 'ID', 'number', 0, '', { required: true })],
    };
  }

  if (method === 'count') {
    return { description, fields: [] };
  }

  return {
    description,
    fields: [],
  };
}

export default function DbTestBenchPage() {
  const { width } = useWindowDimensions();
  const isTwoColumn = width >= 1024;

  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [endpointFilter, setEndpointFilter] = useState('');
  const [endpoints, setEndpoints] = useState<string[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState('debug.previewAll');
  const [tableName, setTableName] = useState('users');
  const [responseText, setResponseText] = useState('No requests yet.');
  const [errorText, setErrorText] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [booleanValues, setBooleanValues] = useState<Record<string, boolean>>({});

  const activeSchema = useMemo<EndpointSchema>(() => {
    return EXPLICIT_SCHEMAS[selectedEndpoint] || createHeuristicSchema(selectedEndpoint);
  }, [selectedEndpoint]);

  useEffect(() => {
    const nextText: Record<string, string> = {};
    const nextBoolean: Record<string, boolean> = {};

    for (const control of activeSchema.fields) {
      if (control.type === 'boolean') {
        const defaultBool = typeof control.defaultValue === 'boolean' ? control.defaultValue : false;
        nextBoolean[control.id] = defaultBool;
        continue;
      }
      if (typeof control.defaultValue === 'string') {
        nextText[control.id] = control.defaultValue;
      } else {
        nextText[control.id] = '';
      }
    }

    setTextValues(nextText);
    setBooleanValues(nextBoolean);
  }, [activeSchema]);

  const filteredEndpoints = useMemo(() => {
    const filter = endpointFilter.trim().toLowerCase();
    if (!filter) {
      return endpoints;
    }
    return endpoints.filter((endpoint) => endpoint.toLowerCase().includes(filter));
  }, [endpointFilter, endpoints]);

  function addLog(level: LogLevel, message: string, detail?: unknown) {
    const entry: LogEntry = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      level,
      message,
      detail:
        detail === undefined
          ? undefined
          : typeof detail === 'string'
            ? detail
            : JSON.stringify(detail, null, 2),
    };

    setLogs((current) => [entry, ...current].slice(0, 300));

    if (level === 'ERROR') {
      console.error('[db-test-bench]', message, detail);
      return;
    }
    if (level === 'WARN') {
      console.warn('[db-test-bench]', message, detail);
      return;
    }
    if (level === 'DEBUG') {
      console.debug('[db-test-bench]', message, detail);
      return;
    }
    console.log('[db-test-bench]', message, detail);
  }

  async function parseResponsePayload(response: Response): Promise<unknown> {
    const rawText = await response.text();
    if (!rawText) {
      return null;
    }

    try {
      return JSON.parse(rawText);
    } catch {
      return { rawText };
    }
  }

  function getResponseHeaders(response: Response): Record<string, string> {
    const result: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  function buildArgsFromSchema(schema: EndpointSchema): unknown[] {
    const args: unknown[] = [];

    for (const control of schema.fields) {
      const currentArg = args[control.argIndex];
      if (args[control.argIndex] === undefined) {
        args[control.argIndex] = control.path ? {} : null;
      }

      if (control.type === 'boolean') {
        const boolValue = Boolean(booleanValues[control.id]);
        if (!control.path) {
          args[control.argIndex] = boolValue;
        } else {
          setNestedValue(args[control.argIndex] as Record<string, unknown>, control.path, boolValue);
        }
        continue;
      }

      const raw = (textValues[control.id] || '').trim();
      if (!raw) {
        if (control.required) {
          throw new Error(`Missing required field: ${control.label}`);
        }
        continue;
      }

      let parsed: unknown = raw;
      if (control.type === 'number') {
        const value = Number(raw);
        if (!Number.isFinite(value)) {
          throw new Error(`Field ${control.label} must be a valid number`);
        }
        parsed = value;
      }

      if (control.type === 'datetime') {
        parsed = new Date(raw).toISOString();
      }

      if (!control.path) {
        args[control.argIndex] = parsed;
      } else {
        const target = (currentArg || args[control.argIndex]) as Record<string, unknown>;
        setNestedValue(target, control.path, parsed);
        args[control.argIndex] = target;
      }
    }

    return args.filter((value) => value !== undefined);
  }

  async function getJson(path: string): Promise<unknown> {
    const url = `${normalizeBaseUrl(baseUrl)}${path}`;
    addLog('INFO', `GET ${url} started`, {
      baseUrl,
      path,
      method: 'GET',
    });
    const startedAt = Date.now();

    const trimmedToken = token.trim();
    const response = await fetch(url, {
      headers: trimmedToken ? { authorization: `Bearer ${trimmedToken}` } : {},
    });
    const data = await parseResponsePayload(response);
    const elapsedMs = Date.now() - startedAt;

    addLog('DEBUG', `GET ${url} completed`, {
      status: response.status,
      ok: response.ok,
      elapsedMs,
      headers: getResponseHeaders(response),
      payloadPreview: data,
    });

    if (!response.ok) {
      throw new Error(JSON.stringify({ status: response.status, data }, null, 2));
    }
    return data;
  }

  async function postJson(path: string, payload: unknown): Promise<unknown> {
    const url = `${normalizeBaseUrl(baseUrl)}${path}`;
    addLog('INFO', `POST ${url} started`, {
      baseUrl,
      path,
      method: 'POST',
      payload,
    });
    const startedAt = Date.now();

    const trimmedToken = token.trim();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(trimmedToken ? { authorization: `Bearer ${trimmedToken}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await parseResponsePayload(response);
    const elapsedMs = Date.now() - startedAt;

    addLog('DEBUG', `POST ${url} completed`, {
      status: response.status,
      ok: response.ok,
      elapsedMs,
      headers: getResponseHeaders(response),
      payloadPreview: data,
    });

    if (!response.ok) {
      throw new Error(JSON.stringify({ status: response.status, data }, null, 2));
    }
    return data;
  }

  async function withBusy(task: () => Promise<void>) {
    const startedAt = Date.now();
    setBusy(true);
    setErrorText('');
    addLog('INFO', 'Action started');
    try {
      await task();
      addLog('INFO', 'Action completed', { elapsedMs: Date.now() - startedAt });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Request failed';
      setErrorText(errorMessage);
      addLog('ERROR', 'Action failed', {
        elapsedMs: Date.now() - startedAt,
        error: errorMessage,
      });
    } finally {
      setBusy(false);
    }
  }

  async function loadEndpoints() {
    await withBusy(async () => {
      const data = (await getJson('/db/testbench/endpoints')) as EndpointsResponse;
      const flat = Array.isArray(data.flatEndpoints) ? data.flatEndpoints : [];
      addLog('INFO', 'Endpoint catalog loaded', { endpointCount: flat.length });
      setEndpoints(flat);
      if (flat.length > 0 && !flat.includes(selectedEndpoint)) {
        setSelectedEndpoint(flat[0]);
      }
      setResponseText(JSON.stringify(data, null, 2));
    });
  }

  async function invokeEndpoint(endpoint: string, args: unknown[]) {
    await withBusy(async () => {
      const data = await postJson('/db/testbench/invoke', {
        endpoint,
        args,
      });
      setResponseText(JSON.stringify(data, null, 2));
    });
  }

  async function runSelectedEndpoint() {
    await withBusy(async () => {
      const args = buildArgsFromSchema(activeSchema);
      addLog('DEBUG', 'Built endpoint args from form schema', { selectedEndpoint, args });
      const data = await postJson('/db/testbench/invoke', {
        endpoint: selectedEndpoint,
        args,
      });
      setResponseText(JSON.stringify(data, null, 2));
    });
  }

  async function runDbHealth() {
    await withBusy(async () => {
      const data = await getJson('/db/health');
      addLog('INFO', 'DB health response received', data);
      setResponseText(JSON.stringify(data, null, 2));
    });
  }

  function renderField(control: FormField) {
    if (control.type === 'boolean') {
      const value = Boolean(booleanValues[control.id]);
      return (
        <View key={control.id} style={styles.fieldBlock}>
          <AppText style={styles.fieldLabel}>{control.label}{control.required ? ' *' : ''}</AppText>
          <View style={styles.booleanRow}>
            <TouchableOpacity
              onPress={() => setBooleanValues((current) => ({ ...current, [control.id]: true }))}
              style={[styles.booleanChoice, value && styles.booleanChoiceSelected]}
            >
              <AppText style={[styles.booleanChoiceText, value && styles.booleanChoiceTextSelected]}>True</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setBooleanValues((current) => ({ ...current, [control.id]: false }))}
              style={[styles.booleanChoice, !value && styles.booleanChoiceSelected]}
            >
              <AppText style={[styles.booleanChoiceText, !value && styles.booleanChoiceTextSelected]}>False</AppText>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View key={control.id} style={styles.fieldBlock}>
        <AppText style={styles.fieldLabel}>{control.label}{control.required ? ' *' : ''}</AppText>
        <AppInput
          value={textValues[control.id] || ''}
          onChangeText={(value) => setTextValues((current) => ({ ...current, [control.id]: value }))}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={control.placeholder || control.label}
          multiline={control.type === 'textarea'}
          numberOfLines={control.type === 'textarea' ? 4 : 1}
          style={control.type === 'textarea' ? styles.textAreaInput : undefined}
        />
      </View>
    );
  }

  const stickyRightColumnStyle = isTwoColumn && Platform.OS === 'web'
    ? ({ position: 'sticky', top: 12, alignSelf: 'flex-start' } as unknown as object)
    : undefined;

  return (
    <AppContainer scrollable>
      <View style={styles.topBar}>
        <NavigationButton onPress={() => router.push('/mainPage')}>Return to Map</NavigationButton>
      </View>

      <AppText variant="title" style={styles.title}>DB Endpoint Test Bench</AppText>
      <AppText style={styles.subtitle}>
        Use this page to call every server DB endpoint, inspect results, and preview live database table rows.
      </AppText>

      <View style={styles.usageCard}>
        <AppText variant="subtitle" style={styles.usageTitle}>How To Use</AppText>
        <AppText style={styles.usageText}>1. Set the server URL, then click Load Endpoint Catalog.</AppText>
        <AppText style={styles.usageText}>2. Pick any endpoint from the list and complete the generated input form.</AppText>
        <AppText style={styles.usageText}>3. Click Run Selected Endpoint to execute the request.</AppText>
        <AppText style={styles.usageText}>4. Use Quick DB Inspection buttons for table previews and row counts.</AppText>
        <AppText style={styles.usageText}>5. Read full response and verbose logs in the output column.</AppText>
      </View>

      <View style={[styles.columns, !isTwoColumn && styles.columnsStacked]}>
        <View style={[styles.leftColumn, !isTwoColumn && styles.fullWidth]}>
          <AppText variant="subtitle" style={styles.sectionTitle}>Server Connection</AppText>
          <AppInput
            value={baseUrl}
            onChangeText={setBaseUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={API_ORIGIN}
          />
          <AppInput
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            placeholder="Auth token (DB_TEST_BENCH_TOKEN)"
          />

          <View style={styles.rowButtons}>
            <AppButton title="Load Endpoint Catalog" variant="primary" onPress={loadEndpoints} style={styles.compactButton} />
            <AppButton title="Check DB Health" variant="outline" onPress={runDbHealth} style={styles.compactButton} />
          </View>

          <AppText variant="subtitle" style={styles.sectionTitle}>Quick DB Inspection</AppText>
          <AppInput
            value={tableName}
            onChangeText={setTableName}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="users"
          />
          <View style={styles.rowButtons}>
            <AppButton
              title="List Tables"
              variant="outline"
              onPress={() => invokeEndpoint('debug.listTables', [])}
              style={styles.compactButton}
            />
            <AppButton
              title="Count Table Rows"
              variant="outline"
              onPress={() => invokeEndpoint('debug.countRows', [tableName])}
              style={styles.compactButton}
            />
          </View>
          <View style={styles.rowButtons}>
            <AppButton
              title="Preview Table Rows"
              variant="secondary"
              onPress={() => invokeEndpoint('debug.listRows', [tableName, { limit: 20, offset: 0, order: 'desc' }])}
              style={styles.compactButton}
            />
            <AppButton
              title="Preview Entire DB"
              variant="secondary"
              onPress={() => invokeEndpoint('debug.previewAll', [{ limit: 5, order: 'desc' }])}
              style={styles.compactButton}
            />
          </View>

          <AppText variant="subtitle" style={styles.sectionTitle}>Invoke Any Endpoint</AppText>
          <AppInput
            value={endpointFilter}
            onChangeText={setEndpointFilter}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Filter endpoints (e.g. workflows.trees)"
          />

          <View style={styles.endpointList}>
            <ScrollView>
              {filteredEndpoints.slice(0, 160).map((endpoint) => {
                const selected = endpoint === selectedEndpoint;
                return (
                  <TouchableOpacity
                    key={endpoint}
                    onPress={() => setSelectedEndpoint(endpoint)}
                    style={[styles.endpointChip, selected && styles.endpointChipSelected]}
                  >
                    <AppText style={[styles.endpointChipText, selected && styles.endpointChipTextSelected]}>{endpoint}</AppText>
                  </TouchableOpacity>
                );
              })}
              {filteredEndpoints.length === 0 && (
                <AppText style={styles.captionText}>No endpoints loaded yet. Tap &quot;Load Endpoint Catalog&quot; first.</AppText>
              )}
            </ScrollView>
          </View>

          <AppText style={styles.captionText}>Selected: {selectedEndpoint || 'none'}</AppText>
          <View style={styles.schemaCard}>
            <AppText style={styles.schemaDescription}>{activeSchema.description}</AppText>
            {activeSchema.fields.length === 0 && <AppText style={styles.captionText}>This endpoint takes no arguments.</AppText>}
            {activeSchema.fields.map((control) => renderField(control))}
          </View>

          <AppButton title="Run Selected Endpoint" variant="accent" onPress={runSelectedEndpoint} />
        </View>

        <View style={[styles.rightColumn, !isTwoColumn && styles.fullWidth, stickyRightColumnStyle]}>
          {busy && <ActivityIndicator size="small" color={Theme.Colours.primary} style={styles.loader} />}

          {!!errorText && (
            <View style={styles.errorCard}>
              <AppText style={styles.errorTitle}>Request Error</AppText>
              <AppText style={styles.errorText}>{errorText}</AppText>
            </View>
          )}

          <View style={styles.responseCard}>
            <AppText variant="subtitle" style={styles.responseTitle}>Response</AppText>
            <AppText style={styles.responseText}>{responseText}</AppText>
          </View>

          <View style={styles.logsCard}>
            <View style={styles.logsHeader}>
              <AppText variant="subtitle" style={styles.logsTitle}>Verbose Logs</AppText>
              <AppButton title="Clear Logs" variant="outline" onPress={() => setLogs([])} style={styles.clearLogsButton} />
            </View>
            <ScrollView style={styles.logsList}>
              {logs.length === 0 && <AppText style={styles.captionText}>No logs yet.</AppText>}
              {logs.map((entry) => (
                <View key={entry.id} style={styles.logRow}>
                  <AppText style={styles.logMeta}>[{entry.timestamp}] [{entry.level}]</AppText>
                  <AppText style={styles.logMessage}>{entry.message}</AppText>
                  {!!entry.detail && <AppText style={styles.logDetail}>{entry.detail}</AppText>}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    marginBottom: Theme.Spacing.medium,
  },
  title: {
    color: Theme.Colours.primary,
    marginBottom: Theme.Spacing.small,
  },
  subtitle: {
    color: Theme.Colours.gray,
    marginBottom: Theme.Spacing.medium,
  },
  usageCard: {
    backgroundColor: '#FFF7E9',
    borderWidth: 1,
    borderColor: '#F2D7A7',
    borderRadius: Theme.Radius.medium,
    padding: Theme.Spacing.medium,
    marginBottom: Theme.Spacing.large,
  },
  usageTitle: {
    color: Theme.Colours.secondary,
    marginBottom: Theme.Spacing.small,
  },
  usageText: {
    color: Theme.Colours.black,
    marginBottom: Theme.Spacing.small,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Theme.Spacing.large,
  },
  columnsStacked: {
    flexDirection: 'column',
  },
  leftColumn: {
    flex: 1,
    minWidth: 0,
  },
  rightColumn: {
    flex: 1,
    minWidth: 0,
  },
  fullWidth: {
    width: '100%',
  },
  sectionTitle: {
    color: Theme.Colours.secondary,
    marginBottom: Theme.Spacing.small,
  },
  rowButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Theme.Spacing.small,
  },
  compactButton: {
    flex: 1,
  },
  endpointList: {
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: Theme.Radius.medium,
    padding: Theme.Spacing.small,
    marginBottom: Theme.Spacing.small,
    maxHeight: 260,
  },
  endpointChip: {
    paddingVertical: Theme.Spacing.small,
    paddingHorizontal: Theme.Spacing.medium,
    borderRadius: Theme.Radius.small,
    borderWidth: 1,
    borderColor: '#DADCE0',
    marginBottom: Theme.Spacing.small,
    backgroundColor: '#F7F8F9',
  },
  endpointChipSelected: {
    borderColor: Theme.Colours.primary,
    backgroundColor: '#E8F2E8',
  },
  endpointChipText: {
    color: Theme.Colours.black,
  },
  endpointChipTextSelected: {
    color: Theme.Colours.primary,
    fontWeight: '600',
  },
  schemaCard: {
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: Theme.Radius.medium,
    padding: Theme.Spacing.medium,
    marginBottom: Theme.Spacing.medium,
    backgroundColor: '#FAFBFC',
  },
  schemaDescription: {
    color: Theme.Colours.gray,
    marginBottom: Theme.Spacing.small,
  },
  fieldBlock: {
    marginBottom: Theme.Spacing.small,
  },
  fieldLabel: {
    color: Theme.Colours.black,
    marginBottom: 6,
    fontWeight: '600',
  },
  textAreaInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  booleanRow: {
    flexDirection: 'row',
    gap: Theme.Spacing.small,
  },
  booleanChoice: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: Theme.Radius.small,
    backgroundColor: '#FFFFFF',
    paddingVertical: Theme.Spacing.small,
    alignItems: 'center',
  },
  booleanChoiceSelected: {
    borderColor: Theme.Colours.primary,
    backgroundColor: '#E8F2E8',
  },
  booleanChoiceText: {
    color: Theme.Colours.gray,
    fontWeight: '600',
  },
  booleanChoiceTextSelected: {
    color: Theme.Colours.primary,
  },
  captionText: {
    color: Theme.Colours.gray,
    marginBottom: Theme.Spacing.small,
  },
  loader: {
    marginBottom: Theme.Spacing.small,
  },
  errorCard: {
    marginTop: Theme.Spacing.small,
    marginBottom: Theme.Spacing.small,
    backgroundColor: '#FDECEC',
    borderRadius: Theme.Radius.medium,
    padding: Theme.Spacing.medium,
    borderWidth: 1,
    borderColor: '#F5C6C6',
  },
  errorTitle: {
    color: Theme.Colours.error,
    fontWeight: '700',
    marginBottom: Theme.Spacing.small,
  },
  errorText: {
    color: Theme.Colours.error,
  },
  responseCard: {
    marginTop: Theme.Spacing.small,
    backgroundColor: '#F8FAF7',
    borderRadius: Theme.Radius.medium,
    padding: Theme.Spacing.medium,
    borderWidth: 1,
    borderColor: '#E2E7DF',
    marginBottom: Theme.Spacing.large,
  },
  responseTitle: {
    color: Theme.Colours.primary,
    marginBottom: Theme.Spacing.small,
  },
  responseText: {
    fontFamily: 'monospace',
    color: Theme.Colours.black,
  },
  logsCard: {
    marginTop: Theme.Spacing.small,
    backgroundColor: '#F1F6FB',
    borderRadius: Theme.Radius.medium,
    padding: Theme.Spacing.medium,
    borderWidth: 1,
    borderColor: '#CFE0EF',
    marginBottom: Theme.Spacing.large,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.Spacing.small,
    gap: Theme.Spacing.small,
  },
  logsTitle: {
    color: Theme.Colours.primary,
    flex: 1,
  },
  clearLogsButton: {
    marginBottom: 0,
    paddingVertical: Theme.Spacing.small,
    paddingHorizontal: Theme.Spacing.medium,
  },
  logsList: {
    maxHeight: 360,
  },
  logRow: {
    marginBottom: Theme.Spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: '#DCE7F1',
    paddingBottom: Theme.Spacing.small,
  },
  logMeta: {
    color: Theme.Colours.gray,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  logMessage: {
    color: Theme.Colours.black,
    fontWeight: '700',
    marginBottom: 2,
  },
  logDetail: {
    color: Theme.Colours.black,
    fontFamily: 'monospace',
  },
});
