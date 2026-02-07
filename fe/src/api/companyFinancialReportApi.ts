import api from './api';

export interface CompanyFinancialSummary {
    period: {
        start_date: string;
        end_date: string;
    };
    revenue: {
        total_contract_value: number;
        paid_in_period: number;
        total_paid: number;
        total_revenue: number;
        outstanding: number;
    };
    project_costs: {
        total: number;
        by_type: {
            material: number;
            equipment: number;
            subcontractor: number;
            other: number;
        };
        by_cost_group: Array<{
            cost_group_id: number;
            cost_group_name: string;
            total: number;
        }>;
    };
    company_costs: {
        total: number;
        by_cost_group: Array<{
            cost_group_id: number;
            cost_group_name: string;
            total: number;
        }>;
        by_status: Record<string, {
            count: number;
            total: number;
        }>;
    };
    summary: {
        total_revenue: number;
        total_project_costs: number;
        total_company_costs: number;
        total_all_costs: number;
        gross_profit: number;
        gross_margin: number;
        net_profit: number;
        net_margin: number;
    };
}

export interface ProfitLossStatement {
    period: {
        start_date: string;
        end_date: string;
    };
    income: {
        revenue: number;
        total_income: number;
    };
    cost_of_goods_sold: {
        project_costs: number;
        total_cogs: number;
    };
    gross_profit: number;
    operating_expenses: {
        company_costs: number;
        total_operating_expenses: number;
    };
    net_profit: number;
    margins: {
        gross_margin: number;
        net_margin: number;
    };
}

export interface FinancialTrend {
    month: string;
    month_name: string;
    revenue: number;
    project_costs: number;
    company_costs: number;
    gross_profit: number;
    net_profit: number;
    gross_margin: number;
    net_margin: number;
}

export const companyFinancialReportApi = {
    // Get company financial summary
    getSummary: async (params?: {
        start_date?: string;
        end_date?: string;
    }) => {
        const response = await api.get('/company-financial-reports/summary', { params });
        return response.data;
    },

    // Get P&L statement
    getProfitLoss: async (params?: {
        start_date?: string;
        end_date?: string;
    }) => {
        const response = await api.get('/company-financial-reports/profit-loss', { params });
        return response.data;
    },

    // Get financial trend
    getTrend: async (months: number = 6) => {
        const response = await api.get('/company-financial-reports/trend', {
            params: { months },
        });
        return response.data;
    },

    // Compare performance between periods
    comparePerformance: async (
        period1Start: string,
        period1End: string,
        period2Start: string,
        period2End: string
    ) => {
        const response = await api.get('/company-financial-reports/compare', {
            params: {
                period1_start: period1Start,
                period1_end: period1End,
                period2_start: period2Start,
                period2_end: period2End,
            },
        });
        return response.data;
    },
};
