// 数据层：点赞/评论 API（T11）
import http from '../http';

export interface CommentItem {
  id: number;
  itemId: number;
  nickname: string;
  content: string;
  createdAt: string;
}

/** 查询某非遗的点赞数 */
export async function fetchLikeCount(itemId: number): Promise<number> {
  const { data } = await http.get<{ count: number }>(`/likes/${itemId}`);
  return data.count;
}

/** 点赞 +1，返回最新点赞数 */
export async function postLike(itemId: number): Promise<number> {
  const { data } = await http.post<{ count: number }>(`/likes/${itemId}`);
  return data.count;
}

/** 查询某非遗的评论列表 */
export async function fetchComments(itemId: number): Promise<CommentItem[]> {
  const { data } = await http.get<{ comments: CommentItem[] }>(`/comments/${itemId}`);
  return data.comments;
}

/** 发表评论，返回新评论对象 */
export async function postComment(itemId: number, nickname: string, content: string): Promise<CommentItem> {
  const { data } = await http.post<{ comment: CommentItem }>(`/comments/${itemId}`, { nickname, content });
  return data.comment;
}
