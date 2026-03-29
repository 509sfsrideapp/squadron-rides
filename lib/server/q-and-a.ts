import {
  createFirestoreDocument,
  deleteFirestoreDocument,
  getFirestoreDocument,
  listFirestoreDocumentsByField,
  patchFirestoreDocument,
} from "./firestore-admin";
import {
  buildQAAuthorLabel,
  buildQACommentVoteId,
  buildQAPostSnippet,
  buildQAPostVoteId,
  normalizeQAVoteValue,
  type QAAuthorProfile,
  type QAVoteValue,
} from "../q-and-a";

type UserProfileRecord = QAAuthorProfile & {
  email?: string | null;
};

export async function buildQAActorData(userId: string, fallbackEmail?: string | null) {
  const userProfile = await getFirestoreDocument<UserProfileRecord>(`users/${userId}`);
  const authorLabel = buildQAAuthorLabel(userProfile, fallbackEmail || userProfile?.email || null);
  const authorPhotoUrl = userProfile?.riderPhotoUrl || userProfile?.driverPhotoUrl || null;

  return {
    authorLabel,
    authorPhotoUrl,
  };
}

export async function createQAPost(input: {
  authorId: string;
  authorEmail?: string | null;
  title: string;
  body: string;
}) {
  const actorData = await buildQAActorData(input.authorId, input.authorEmail || null);

  const created = (await createFirestoreDocument("qaPosts", {
    authorId: input.authorId,
    authorLabel: actorData.authorLabel,
    authorPhotoUrl: actorData.authorPhotoUrl,
    title: input.title.trim(),
    body: input.body.trim() || "",
    snippet: buildQAPostSnippet(input.body),
    createdAt: new Date(),
    updatedAt: new Date(),
    commentCount: 0,
    score: 0,
    deleted: false,
    tags: [],
  })) as { name?: string };

  return created.name?.split("/").pop() || "";
}

type QAPostEditableRecord = {
  authorId: string;
  deleted?: boolean;
};

export async function updateQAPost(input: {
  postId: string;
  authorId: string;
  title: string;
  body: string;
}) {
  const postRecord = await getFirestoreDocument<QAPostEditableRecord>(`qaPosts/${input.postId}`);

  if (!postRecord || postRecord.deleted) {
    throw new Error("That post is unavailable.");
  }

  if (postRecord.authorId !== input.authorId) {
    throw new Error("You can only edit your own posts.");
  }

  await patchFirestoreDocument(`qaPosts/${input.postId}`, {
    title: input.title.trim(),
    body: input.body.trim() || "",
    snippet: buildQAPostSnippet(input.body),
    updatedAt: new Date(),
  });
}

export async function deleteQAPost(input: { postId: string; authorId: string }) {
  const postRecord = await getFirestoreDocument<QAPostEditableRecord>(`qaPosts/${input.postId}`);

  if (!postRecord || postRecord.deleted) {
    throw new Error("That post is unavailable.");
  }

  if (postRecord.authorId !== input.authorId) {
    throw new Error("You can only delete your own posts.");
  }

  await patchFirestoreDocument(`qaPosts/${input.postId}`, {
    title: "",
    body: "",
    snippet: "",
    deleted: true,
    updatedAt: new Date(),
  });
}

type QAVoteRecord = {
  value?: number;
};

export async function recountQAPostScore(postId: string) {
  const votes = await listFirestoreDocumentsByField("qaPostVotes", "postId", postId) as Array<{
    id: string;
    path: string;
    value?: number;
  }>;
  const score = votes.reduce((sum, vote) => sum + normalizeQAVoteValue(Number(vote.value || 0)), 0);

  await patchFirestoreDocument(`qaPosts/${postId}`, {
    score,
    updatedAt: new Date(),
  });

  return score;
}

export async function recountQACommentScore(commentId: string) {
  const votes = await listFirestoreDocumentsByField("qaCommentVotes", "commentId", commentId) as Array<{
    id: string;
    path: string;
    value?: number;
  }>;
  const score = votes.reduce((sum, vote) => sum + normalizeQAVoteValue(Number(vote.value || 0)), 0);

  await patchFirestoreDocument(`qaComments/${commentId}`, {
    score,
    updatedAt: new Date(),
  });

  return score;
}

export async function setQAPostVote(input: {
  postId: string;
  userId: string;
  value: QAVoteValue;
}) {
  const voteId = buildQAPostVoteId(input.postId, input.userId);
  const existingVote = await getFirestoreDocument<QAVoteRecord>(`qaPostVotes/${voteId}`);

  if (input.value === 0) {
    await deleteFirestoreDocument(`qaPostVotes/${voteId}`);
  } else if (existingVote) {
    await patchFirestoreDocument(`qaPostVotes/${voteId}`, {
      value: input.value,
    });
  } else {
    await createFirestoreDocument(
      "qaPostVotes",
      {
        postId: input.postId,
        userId: input.userId,
        value: input.value,
      },
      voteId
    );
  }

  return recountQAPostScore(input.postId);
}

export async function setQACommentVote(input: {
  commentId: string;
  userId: string;
  value: QAVoteValue;
}) {
  const voteId = buildQACommentVoteId(input.commentId, input.userId);
  const existingVote = await getFirestoreDocument<QAVoteRecord>(`qaCommentVotes/${voteId}`);

  if (input.value === 0) {
    await deleteFirestoreDocument(`qaCommentVotes/${voteId}`);
  } else if (existingVote) {
    await patchFirestoreDocument(`qaCommentVotes/${voteId}`, {
      value: input.value,
    });
  } else {
    await createFirestoreDocument(
      "qaCommentVotes",
      {
        commentId: input.commentId,
        userId: input.userId,
        value: input.value,
      },
      voteId
    );
  }

  return recountQACommentScore(input.commentId);
}

export async function recountQAPostComments(postId: string) {
  const comments = await listFirestoreDocumentsByField("qaComments", "postId", postId);
  const nextCount = comments.length;

  await patchFirestoreDocument(`qaPosts/${postId}`, {
    commentCount: nextCount,
    updatedAt: new Date(),
  });

  return nextCount;
}

export async function recountQACommentReplies(commentId: string) {
  const replies = await listFirestoreDocumentsByField("qaComments", "parentCommentId", commentId);
  const nextCount = replies.length;

  await patchFirestoreDocument(`qaComments/${commentId}`, {
    replyCount: nextCount,
    updatedAt: new Date(),
  });

  return nextCount;
}
