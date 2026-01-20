import React, { useState, useEffect } from 'react';

const ReviewsManagement = ({ token, onReviewUpdate }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reviews');
      const data = await response.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load reviews:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const updateReviewStatus = async (reviewId, newStatus) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const updated = await response.json();
        setReviews(reviews.map(r => (r._id === reviewId || r.id === reviewId) ? updated : r));
        if (onReviewUpdate) onReviewUpdate();
      }
    } catch (error) {
      console.error('Failed to update review:', error);
    }
  };

  const deleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;

    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setReviews(reviews.filter(r => (r._id !== reviewId && r.id !== reviewId)));
        if (onReviewUpdate) onReviewUpdate();
      }
    } catch (error) {
      console.error('Failed to delete review:', error);
    }
  };

  const filteredReviews = reviews.filter(r => {
    if (filter === 'all') return true;
    return (r.status || 'approved') === filter;
  });

  const StarRating = ({ rating }) => {
    return (
      <div className="star-rating">
        {[...Array(5)].map((_, i) => (
          <span key={i} className={`star ${i < rating ? 'filled' : ''}`}>★</span>
        ))}
      </div>
    );
  };

  const ReviewCard = ({ review }) => {
    const status = review.status || 'approved';
    return (
      <div className="review-card">
        <div className="review-header">
          <div className="review-meta">
            <h4 className="review-author">{review.name || 'Anonymous'}</h4>
            <StarRating rating={review.rating || 5} />
            <span className={`review-status ${status}`}>{status.toUpperCase()}</span>
          </div>
          <div className="review-date">
            {new Date(review.createdAt).toLocaleDateString()}
          </div>
        </div>

        {review.title && <p className="review-title">{review.title}</p>}
        <p className="review-comment">{review.comment}</p>

        <div className="review-product">
          <span>📦 Product ID: {review.productId}</span>
        </div>

        <div className="review-actions">
          {status !== 'approved' && (
            <button
              className="btn-approve"
              onClick={() => updateReviewStatus(review._id || review.id, 'approved')}
            >
              ✓ Approve
            </button>
          )}
          {status !== 'rejected' && (
            <button
              className="btn-reject"
              onClick={() => updateReviewStatus(review._id || review.id, 'rejected')}
            >
              ✗ Reject
            </button>
          )}
          <button
            className="btn-delete"
            onClick={() => deleteReview(review._id || review.id)}
          >
            🗑 Delete
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="reviews-management">
      <div className="reviews-header">
        <h3>Review Management</h3>
        <div className="filter-buttons">
          {['pending', 'approved', 'rejected', 'all'].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="count">
                ({reviews.filter(r => f === 'all' || (r.status || 'approved') === f).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading reviews...</div>
      ) : filteredReviews.length === 0 ? (
        <div className="no-reviews">
          <p>No {filter} reviews found</p>
        </div>
      ) : (
        <div className="reviews-list">
          {filteredReviews.map(review => (
            <ReviewCard key={review._id || review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewsManagement;
