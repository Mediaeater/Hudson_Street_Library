// Hudson Street Library - Modern UI Components
// Clean, elegant components following the design system principles

class UIComponents {
    // Button component with modern styling
    static button({
        text = '',
        variant = 'primary',
        size = 'medium',
        onClick = () => {},
        disabled = false,
        className = ''
    }) {
        const sizeClasses = {
            small: 'px-3 py-1.5 text-sm',
            medium: 'px-4 py-2.5',
            large: 'px-6 py-3 text-lg'
        };

        const variantClasses = {
            primary: 'bg-neutral-900 text-white hover:bg-neutral-800',
            secondary: 'border border-black/8 hover:bg-neutral-50',
            ghost: 'text-neutral-700 hover:bg-neutral-100',
            accent: 'bg-primary-600 text-white hover:bg-primary-700',
            destructive: 'bg-red-600 text-white hover:bg-red-700'
        };

        const baseClasses = 'btn rounded-lg font-medium transition-all duration-120 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500';

        const button = document.createElement('button');
        button.className = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;
        button.textContent = text;
        button.onclick = onClick;
        button.disabled = disabled;

        if (disabled) {
            button.className += ' opacity-50 cursor-not-allowed';
        }

        return button;
    }

    // Clean card component
    static card({
        title = '',
        description = '',
        action = null,
        className = ''
    }) {
        const card = document.createElement('div');
        card.className = `rounded-xl border border-black/8 bg-white p-6 ${className}`;

        if (title) {
            const titleEl = document.createElement('h3');
            titleEl.className = 'text-lg font-semibold';
            titleEl.textContent = title;
            card.appendChild(titleEl);
        }

        if (description) {
            const descEl = document.createElement('p');
            descEl.className = 'mt-2 text-neutral-600';
            descEl.textContent = description;
            card.appendChild(descEl);
        }

        if (action) {
            const actionEl = document.createElement('div');
            actionEl.className = 'mt-4';
            actionEl.appendChild(action);
            card.appendChild(actionEl);
        }

        return card;
    }

    // Input field with modern styling
    static input({
        type = 'text',
        placeholder = '',
        label = '',
        id = '',
        value = '',
        onChange = () => {},
        className = ''
    }) {
        const container = document.createElement('div');
        container.className = 'space-y-2';

        if (label) {
            const labelEl = document.createElement('label');
            labelEl.className = 'block text-sm font-medium';
            labelEl.textContent = label;
            if (id) labelEl.setAttribute('for', id);
            container.appendChild(labelEl);
        }

        const input = document.createElement('input');
        input.type = type;
        input.className = `w-full px-3 py-2 border border-black/8 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-120 ${className}`;
        input.placeholder = placeholder;
        input.value = value;
        if (id) input.id = id;
        input.addEventListener('input', onChange);

        container.appendChild(input);
        return container;
    }

    // Clean alert component
    static alert({
        message = '',
        type = 'info',
        title = '',
        className = ''
    }) {
        const typeConfig = {
            info: {
                bg: 'bg-blue-50',
                border: 'border-blue-200',
                text: 'text-blue-700',
                titleColor: 'text-blue-900',
                icon: 'ℹ'
            },
            success: {
                bg: 'bg-green-50',
                border: 'border-green-200',
                text: 'text-green-700',
                titleColor: 'text-green-900',
                icon: '✓'
            },
            warning: {
                bg: 'bg-amber-50',
                border: 'border-amber-200',
                text: 'text-amber-700',
                titleColor: 'text-amber-900',
                icon: '⚠'
            },
            error: {
                bg: 'bg-red-50',
                border: 'border-red-200',
                text: 'text-red-700',
                titleColor: 'text-red-900',
                icon: '✕'
            }
        };

        const config = typeConfig[type];
        const alert = document.createElement('div');
        alert.className = `rounded-lg border ${config.border} ${config.bg} p-4 ${className}`;

        const content = document.createElement('div');
        content.className = 'flex gap-3';

        const icon = document.createElement('div');
        icon.className = `${config.text} mt-0.5`;
        icon.textContent = config.icon;
        content.appendChild(icon);

        const textContainer = document.createElement('div');

        if (title) {
            const titleEl = document.createElement('h4');
            titleEl.className = `text-sm font-medium ${config.titleColor}`;
            titleEl.textContent = title;
            textContainer.appendChild(titleEl);
        }

        const messageEl = document.createElement('p');
        messageEl.className = `${title ? 'mt-1' : ''} text-sm ${config.text}`;
        messageEl.textContent = message;
        textContainer.appendChild(messageEl);

        content.appendChild(textContainer);
        alert.appendChild(content);

        return alert;
    }

    // Skeleton loader
    static skeleton({
        lines = 3,
        className = ''
    }) {
        const container = document.createElement('div');
        container.className = `space-y-3 ${className}`;

        for (let i = 0; i < lines; i++) {
            const line = document.createElement('div');
            const widths = ['w-3/4', 'w-full', 'w-5/6'];
            line.className = `h-3 ${widths[i % 3]} rounded bg-gradient-to-r from-neutral-100 via-neutral-200 to-neutral-100 animate-pulse`;
            container.appendChild(line);
        }

        return container;
    }

    // Clean modal dialog
    static modal({
        title = '',
        content = '',
        onConfirm = () => {},
        onCancel = () => {},
        isOpen = false
    }) {
        const overlay = document.createElement('div');
        overlay.className = `${isOpen ? 'flex' : 'hidden'} fixed inset-0 z-50 items-center justify-center p-4 bg-black/20 backdrop-blur-sm transition-opacity duration-200`;

        const modal = document.createElement('div');
        modal.className = 'bg-white rounded-xl border border-black/8 p-6 max-w-md w-full';

        if (title) {
            const titleEl = document.createElement('h3');
            titleEl.className = 'text-lg font-semibold mb-2';
            titleEl.textContent = title;
            modal.appendChild(titleEl);
        }

        const contentEl = document.createElement('p');
        contentEl.className = 'text-neutral-600 mb-6';
        contentEl.textContent = content;
        modal.appendChild(contentEl);

        const actions = document.createElement('div');
        actions.className = 'flex gap-3 justify-end';

        const cancelBtn = this.button({
            text: 'Cancel',
            variant: 'secondary',
            onClick: () => {
                overlay.classList.add('hidden');
                onCancel();
            }
        });

        const confirmBtn = this.button({
            text: 'Confirm',
            variant: 'primary',
            onClick: () => {
                overlay.classList.add('hidden');
                onConfirm();
            }
        });

        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);
        modal.appendChild(actions);

        overlay.appendChild(modal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.add('hidden');
                onCancel();
            }
        });

        return overlay;
    }

    // Clean table component
    static table({
        headers = [],
        data = [],
        className = ''
    }) {
        const container = document.createElement('div');
        container.className = `rounded-xl border border-black/8 bg-white overflow-hidden ${className}`;

        const table = document.createElement('table');
        table.className = 'w-full';

        // Header
        const thead = document.createElement('thead');
        thead.className = 'bg-neutral-50 border-b border-black/8';
        const headerRow = document.createElement('tr');

        headers.forEach(header => {
            const th = document.createElement('th');
            th.className = 'px-6 py-3 text-left text-sm font-medium';
            th.textContent = header;
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Body
        const tbody = document.createElement('tbody');
        tbody.className = 'divide-y divide-black/8';

        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-neutral-50 transition-colors duration-120';

            row.forEach((cell, index) => {
                const td = document.createElement('td');
                td.className = 'px-6 py-4';
                if (index > 0) td.className += ' text-neutral-600';

                if (typeof cell === 'string') {
                    td.textContent = cell;
                } else {
                    td.appendChild(cell);
                }

                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        container.appendChild(table);

        return container;
    }

    // Empty state component
    static emptyState({
        icon = '📚',
        title = 'No items found',
        description = 'Try adjusting your filters or search terms.',
        action = null,
        className = ''
    }) {
        const container = document.createElement('div');
        container.className = `text-center py-12 ${className}`;

        const iconContainer = document.createElement('div');
        iconContainer.className = 'w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl';
        iconContainer.textContent = icon;
        container.appendChild(iconContainer);

        const titleEl = document.createElement('h3');
        titleEl.className = 'text-lg font-semibold mb-2';
        titleEl.textContent = title;
        container.appendChild(titleEl);

        const descEl = document.createElement('p');
        descEl.className = 'text-neutral-600 mb-6 max-w-sm mx-auto';
        descEl.textContent = description;
        container.appendChild(descEl);

        if (action) {
            container.appendChild(action);
        }

        return container;
    }

    // Loading spinner
    static spinner({
        size = 'medium',
        className = ''
    }) {
        const sizeClasses = {
            small: 'h-4 w-4 border',
            medium: 'h-8 w-8 border-2',
            large: 'h-12 w-12 border-2'
        };

        const spinner = document.createElement('div');
        spinner.className = `animate-spin rounded-full ${sizeClasses[size]} border-neutral-200 border-t-primary-600 ${className}`;

        return spinner;
    }

    // Badge component
    static badge({
        text = '',
        variant = 'default',
        className = ''
    }) {
        const variantClasses = {
            default: 'bg-neutral-100 text-neutral-700',
            success: 'bg-green-100 text-green-700',
            warning: 'bg-amber-100 text-amber-700',
            error: 'bg-red-100 text-red-700',
            info: 'bg-blue-100 text-blue-700'
        };

        const badge = document.createElement('span');
        badge.className = `inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${variantClasses[variant]} ${className}`;
        badge.textContent = text;

        return badge;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIComponents;
}