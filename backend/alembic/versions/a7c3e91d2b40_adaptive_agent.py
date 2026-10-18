"""adaptive agent: event stream and trial conclusions

Revision ID: a7c3e91d2b40
Revises: 489ae31cf0dd
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'a7c3e91d2b40'
down_revision = '489ae31cf0dd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('agent_events',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('kind', sa.String(), nullable=False),
    sa.Column('summary', sa.Text(), nullable=False),
    sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('changes', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_agent_event_user_time', 'agent_events', ['user_id', 'created_at'], unique=False)
    op.create_table('trial_conclusions',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('nct_id', sa.String(), nullable=False),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('previous_status', sa.String(), nullable=True),
    sa.Column('reason', sa.Text(), nullable=False),
    sa.Column('criteria', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('record_hash', sa.String(), nullable=False),
    sa.Column('provisional', sa.Boolean(), nullable=False),
    sa.Column('changed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('seen_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'nct_id', name='uq_conclusion_user_trial')
    )
    op.create_index(op.f('ix_trial_conclusions_user_id'), 'trial_conclusions', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_trial_conclusions_user_id'), table_name='trial_conclusions')
    op.drop_table('trial_conclusions')
    op.drop_index('ix_agent_event_user_time', table_name='agent_events')
    op.drop_table('agent_events')
