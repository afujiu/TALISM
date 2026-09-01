<script>
	let id = `accordion-${Math.random().toString(36).slice(2)}`;
</script>

<input id={id} type="checkbox" hidden checked>

<div class="accordion">
	<label for={id} class="title">
		<h3><slot name="title"></slot></h3>
		<span class="icon">▼</span>
	</label>

	<div class="content">
		<slot></slot>
	</div>
</div>

<style>
	.accordion {
		border: 1px solid #ccc;
		overflow: hidden;
	}

	.title {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px;
		cursor: pointer;
		user-select: none;
	}

	.title h3 {
		margin: 0;
		font-size: 1rem;
	}

	.content {
		max-height: 0;
		overflow: hidden;
		padding: 0 12px;
		transition:
			max-height .1s ease,
			padding .1s ease;
	}

	.icon {
		transition: transform .1s;
		color:var(--base-gray3);
	}

	/* 開いた状態 */
	input:checked + .accordion .content {
		max-height: 1000px; /* 十分大きい値 */
		padding: 12px;
	}

	input:checked + .accordion .icon {
		transform: rotate(180deg);
	}
</style>