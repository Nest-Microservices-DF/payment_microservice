import { Controller, Get } from '@nestjs/common';

@Controller('health-check')
export class HealthCheckController {

    @Get()
    healthCheck() {
        return 'Payments Webhook is up and running!';
    }

}
